/**
 * NAGI brain — the reusable receptionist core.
 *
 * This module owns ALL of NAGI's receptionist behaviour (intent handling,
 * business knowledge tools, owner settings, appointment + calendar rules,
 * handoff, language mirroring). It is transport-agnostic: the chat route is
 * one consumer, and a future voice interface can reuse the exact same brain
 * by calling `createNagiSession` and then `streamNagiReply` / `generateNagiReply`.
 *
 * Server-side only.
 */
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  DAY_NAMES_EN,
  DAY_NAMES_JA,
  createUserClient,
  getBusinessForUser,
  getNagiConfig,
  get_business_hours,
  get_business_info,
  get_faqs,
  get_policies,
  get_service_details,
  get_services,
  get_staff,
  get_staff_services,
  type AuthedClient,
  type NagiConfig,
} from "@/lib/nagi-data.server";
import {
  availabilityFor,
  bookAppointment,
  cancelAppointment,
  findAppointments,
  rescheduleAppointment,
  saveConversation,
  type CalendarLink,
} from "@/lib/nagi-booking.server";
import { listEvents, zonedToUtc } from "@/server/googleCalendar.server";

export const NAGI_MODEL = "google/gemini-3.7-flash";
/** Tokens the presentation layer may render as system events. */
export const NAGI_TOKENS = {
  handoff: "[[HANDOFF]]",
  bookingConfirmed: "[[BOOKING_CONFIRMED]]",
  bookingCancelled: "[[BOOKING_CANCELLED]]",
} as const;

function dateContext(timezone: string) {
  const now = new Date();
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  // Resolve the weekday index in the business timezone.
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  const weekdayIndex = Math.max(
    0,
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort),
  );
  const day = 86_400_000;
  const label = (offset: number) => {
    const d = new Date(now.getTime() + offset * day);
    const idx = (weekdayIndex + offset) % 7;
    return `${fmt(d)} (${DAY_NAMES_EN[idx]} / ${DAY_NAMES_JA[idx]}曜日, day_of_week=${idx})`;
  };
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return [
    `Timezone: ${timezone}`,
    `Current local time: ${clock}`,
    `Today / 今日: ${label(0)}`,
    `Tomorrow / 明日: ${label(1)}`,
    `Day after tomorrow / 明後日: ${label(2)}`,
  ].join("\n");
}

type CalendarCtx = {
  connectionAPIKey: string;
  calendarId: string;
  timezone: string;
};

function buildTools(
  supabase: AuthedClient,
  businessId: string,
  calendar: CalendarCtx | null,
  timezone: string,
  config: NagiConfig,
  channel: NagiChannel,
) {
  const link: CalendarLink = calendar
    ? { connectionAPIKey: calendar.connectionAPIKey, calendarId: calendar.calendarId }
    : null;
  const bookingTools = buildBookingTools(supabase, businessId, timezone, link, config, channel);
  const calendarTools = calendar ? buildCalendarTools(calendar) : {};
  return {
    ...bookingTools,
    ...calendarTools,
    get_business_info: tool({
      description:
        "Get the business name, phone number, address, website and timezone. Use for location, contact or general questions.",
      inputSchema: z.object({}),
      execute: async () => get_business_info(supabase, businessId),
    }),
    get_business_hours: tool({
      description:
        "Get the weekly opening hours (per day_of_week, 0=Sunday). Use for any question about opening/closing times or holidays.",
      inputSchema: z.object({}),
      execute: async () => get_business_hours(supabase, businessId),
    }),
    get_services: tool({
      description:
        "List all active services with price (JPY), duration in minutes and description.",
      inputSchema: z.object({}),
      execute: async () => get_services(supabase, businessId),
    }),
    get_service_details: tool({
      description:
        "Get the price, duration, description and capable staff for one named service. Use for questions like 'how much is a cut?'.",
      inputSchema: z.object({
        service: z.string().describe("Service name as the customer said it"),
      }),
      execute: async ({ service }) => get_service_details(supabase, businessId, service),
    }),
    get_staff: tool({
      description: "List active staff with the services they handle and their working hours.",
      inputSchema: z.object({}),
      execute: async () => get_staff(supabase, businessId),
    }),
    get_staff_services: tool({
      description: "Get the services one named staff member can provide.",
      inputSchema: z.object({ staff: z.string().describe("Staff member name") }),
      execute: async ({ staff }) => get_staff_services(supabase, businessId, staff),
    }),
    get_faqs: tool({
      description:
        "Get the business's own frequently asked questions and their approved answers. Use when the customer asks something that may be covered by store policy or general questions.",
      inputSchema: z.object({}),
      execute: async () => get_faqs(supabase, businessId),
    }),
    get_policies: tool({
      description:
        "Get the business's cancellation, late arrival and reservation policies plus other owner instructions. Use for any question about cancelling, changing, being late or booking rules.",
      inputSchema: z.object({}),
      execute: async () => get_policies(supabase, businessId),
    }),
  };
}

const dateSchema = z.string().describe("Date in YYYY-MM-DD (business timezone)");
const timeSchema = z.string().describe("Time in 24h HH:MM (business timezone)");

/** Read-only Google Calendar visibility, only when a calendar is connected. */
function buildCalendarTools(calendar: CalendarCtx) {
  const { connectionAPIKey, calendarId, timezone } = calendar;
  return {
    list_calendar_events: tool({
      description:
        "Read existing calendar events between two dates to see what is already scheduled.",
      inputSchema: z.object({ from_date: dateSchema, to_date: dateSchema }),
      execute: async ({ from_date, to_date }) =>
        listEvents(
          connectionAPIKey,
          calendarId,
          zonedToUtc(from_date, "00:00", timezone).toISOString(),
          zonedToUtc(to_date, "23:59", timezone).toISOString(),
        ),
    }),
  };
}

/** Real appointment operations against the business's own records. */
function buildBookingTools(
  supabase: AuthedClient,
  businessId: string,
  timezone: string,
  calendar: CalendarLink,
  config: NagiConfig,
  channel: NagiChannel,
) {
  const availability = {
    check_availability: tool({
      description:
        "Check open appointment start times on a date, using the business opening hours, existing appointments and (when connected) the owner's Google Calendar. Always call before proposing or booking a time.",
      inputSchema: z.object({
        date: dateSchema,
        duration_minutes: z
          .number()
          .describe("Appointment length in minutes (use the service duration)"),
      }),
      execute: async ({ date, duration_minutes }) =>
        availabilityFor(supabase, businessId, timezone, calendar, date, duration_minutes),
    }),
  };

  const create = config.can_accept_appointments
    ? {
        book_appointment: tool({
          description:
            "Create the real appointment. Only call after check_availability showed the exact time is free AND the customer explicitly confirmed the details.",
          inputSchema: z.object({
            date: dateSchema,
            time: timeSchema,
            duration_minutes: z.number(),
            service: z.string(),
            customer_name: z.string(),
            customer_phone: z.string(),
            staff: z.string().optional(),
            notes: z.string().optional(),
          }),
          execute: async (input) =>
            bookAppointment(supabase, businessId, timezone, calendar, channel, input),
        }),
      }
    : {};

  const lookup =
    config.can_change_appointments || config.can_cancel_appointments
      ? {
          find_appointments: tool({
            description:
              "Find the customer's upcoming appointments by their phone number. Use before changing or cancelling a booking.",
            inputSchema: z.object({ customer_phone: z.string() }),
            execute: async ({ customer_phone }) =>
              findAppointments(supabase, businessId, timezone, customer_phone),
          }),
        }
      : {};

  const change = config.can_change_appointments
    ? {
        reschedule_appointment: tool({
          description:
            "Move an existing appointment to a new date/time. Call find_appointments first and confirm with the customer.",
          inputSchema: z.object({
            appointment_id: z.string(),
            date: dateSchema,
            time: timeSchema,
          }),
          execute: async ({ appointment_id, date, time }) =>
            rescheduleAppointment(
              supabase,
              businessId,
              timezone,
              calendar,
              appointment_id,
              date,
              time,
            ),
        }),
      }
    : {};

  const cancel = config.can_cancel_appointments
    ? {
        cancel_appointment: tool({
          description:
            "Cancel an existing appointment. Call find_appointments first and confirm with the customer.",
          inputSchema: z.object({ appointment_id: z.string() }),
          execute: async ({ appointment_id }) =>
            cancelAppointment(supabase, businessId, calendar, appointment_id),
        }),
      }
    : {};

  return { ...availability, ...create, ...lookup, ...change, ...cancel };
}

function toneLine(tone: string) {
  switch (tone) {
    case "friendly":
      return "Tone: friendly and approachable, still polite (親しみやすく丁寧).";
    case "warm":
      return "Tone: warm, caring and reassuring (温かく親身).";
    case "concise":
      return "Tone: efficient and to the point — the shortest polite answer possible.";
    default:
      return "Tone: professional, composed and courteous (プロフェッショナルで礼儀正しい).";
  }
}

function capabilityRules(config: NagiConfig) {
  const on = (flag: boolean, label: string) => `- ${label}: ${flag ? "ENABLED" : "DISABLED"}`;
  const lines = [
    on(config.can_answer_faqs, "Answering FAQs"),
    on(config.can_explain_services, "Explaining services"),
    on(config.can_explain_prices, "Explaining prices"),
    on(config.can_explain_hours, "Explaining business hours"),
    on(config.can_accept_appointments, "Accepting appointment requests"),
    on(config.can_change_appointments, "Changing appointments"),
    on(config.can_cancel_appointments, "Cancelling appointments"),
    on(config.can_transfer_to_staff, "Transferring to staff"),
  ];
  return lines.join("\n");
}

function handoffRules(config: NagiConfig) {
  const reasons: string[] = [];
  if (config.handoff_on_request) reasons.push("the customer asks to speak to a human/staff member");
  if (config.handoff_on_unknown) reasons.push("you do not know the answer");
  if (config.handoff_on_complaint) reasons.push("the customer is complaining or upset");
  if (config.handoff_outside_scope)
    reasons.push("the question is outside the stored business information");
  if (config.handoff_manual_enabled) reasons.push("you judge that a staff member should take over");
  return reasons.length > 0
    ? reasons.map((r) => `- ${r}`).join("\n")
    : "- (no handoff rules configured)";
}

/** The channel NAGI is currently speaking through. Voice can pass "voice" later. */
export type NagiChannel = "chat" | "voice";

function systemPrompt(
  businessName: string,
  timezone: string,
  config: NagiConfig,
  calendarConnected: boolean,
  channel: NagiChannel,
) {
  const custom = config.custom_instructions.trim();
  const channelLine =
    channel === "voice"
      ? "You are speaking with a customer on a live phone call; your words are spoken aloud."
      : "You are answering a customer in a text chat that simulates a phone call.";
  return `You are NAGI (ナギ), the AI receptionist of "${businessName}". ${channelLine}

PERSONALITY
- Warm, polite, calm, helpful, concise, natural.
- ${toneLine(config.tone)}
- In Japanese, use natural polite business Japanese (丁寧語・敬語), never robotic translation.
- ALWAYS reply in the same language the customer used in their latest message. Never translate business data (service names, staff names, FAQ answers, policies) — quote them exactly as stored.
- Keep replies short: 1–3 sentences, like a real receptionist on the phone. No markdown headings and no emoji.
- Remember everything the customer already told you in this conversation (service, date, time, name, phone, staff preference) and never ask for the same detail twice. Ask only for what is still missing, one question at a time.
${custom ? `\nOWNER'S ADDITIONAL INSTRUCTIONS (follow these, they never override the safety rules below)\n${custom}\n` : ""}
DATE CONTEXT
${dateContext(timezone)}
When the customer says today/tomorrow/明日/明後日 or a weekday name, resolve it to the matching day_of_week and use the stored hours for that day.

DATA ACCESS — CRITICAL
- You know NOTHING about this business except what the tools return. Prices, durations, hours, staff, address, phone, FAQs and policies MUST come from a tool call in this conversation.
- Call the tools whenever a factual answer is needed, every time (data may have changed since the last message).
- NEVER invent, guess, estimate or extrapolate: prices, discounts, promotions, opening hours, staff availability, services, policies, parking, facilities, payment methods.
- When the customer asks about cancelling, changing, being late, or booking rules, call get_policies and answer with the owner's configured policy wording. Never invent a policy.
- If the tools do not contain the requested information, say so clearly and escalate to staff.
  Japanese: 「申し訳ありません。現在登録されている店舗情報では、〇〇について確認できません。スタッフに確認いたしますので、少しお時間をいただけますか。」
  English: "I'm sorry, I don't have confirmed information about that. A staff member would need to confirm it for you."
- Format JPY prices naturally (e.g. 4,000円 in Japanese, ¥4,000 in English) and durations in minutes.

WHAT THE OWNER ALLOWS YOU TO HANDLE — ABSOLUTE
${capabilityRules(config)}
- If a capability is DISABLED you must NOT perform it and must NOT claim to perform it. Politely explain that this cannot be handled automatically right now and that a staff member will assist.
  Example when appointment requests are DISABLED — Japanese: 「申し訳ありません。予約についてはスタッフが対応いたします。」 English: "I'm sorry, appointment requests are handled by our staff."
- Do not collect booking details for a disabled capability.

HUMAN HANDOFF
Request staff assistance when:
${handoffRules(config)}
- To hand off, put the token ${NAGI_TOKENS.handoff} on the FIRST line, then a short polite message.
  Japanese: 「スタッフへの確認が必要です。担当者よりご連絡いたします。」 English: "A staff member needs to assist with this. Our team will follow up with you."
- Never claim you have transferred the call live; say a staff member will follow up.

APPOINTMENTS — REAL BOOKINGS
- Appointments you create, move or cancel are REAL records in the business system${calendarConnected ? " and are synced to the owner's Google Calendar" : ""}. Be accurate.
- When a customer asks for an appointment: (1) identify the service with get_services / get_service_details to get its duration, (2) identify the exact date and time (ask if vague, e.g. "afternoon"; resolve 明日/tomorrow using the date context), (3) call check_availability for that date with the service duration — it already accounts for opening hours, existing appointments${calendarConnected ? " and calendar conflicts" : ""}.
- If the requested time appears in available_slots, tell the customer it is available. Japanese example: 「明日の15時でしたら空いております。」
- If it is not available, apologise and offer 2-3 nearby times from available_slots. Japanese example: 「申し訳ありません。15時は埋まっています。14時または16時はいかがでしょうか？」 If the day is closed or has no slots, say so and suggest another day.
- Never offer a time that is not in available_slots, and never invent availability without calling the tool.
- Once a time is agreed, collect the customer's name and phone number (one question at a time), then read back service, date, time and ask for explicit confirmation (「この内容で予約してもよろしいですか？」).
- Only after the customer clearly confirms, call book_appointment. When it returns created:true, put the token ${NAGI_TOKENS.bookingConfirmed} on the FIRST line and briefly confirm date, time and service. If it returns created:false, apologise and offer the returned available_slots. Never claim a booking exists unless the tool succeeded.
- To change or cancel, first call find_appointments with the customer's phone number, confirm which appointment, quote the relevant policy with get_policies, then call reschedule_appointment or cancel_appointment. After a successful cancellation put ${NAGI_TOKENS.bookingCancelled} on the FIRST line.
- If a booking/change/cancel capability is DISABLED above, do not perform it and explain that staff will handle it.`;
}

/** Why a NAGI session could not be created. Callers map these to their own transport errors. */
export type NagiSessionError =
  "unauthorized" | "backend_not_configured" | "missing_api_key" | "no_business" | "nagi_disabled";

export class NagiError extends Error {
  constructor(
    public readonly reason: NagiSessionError,
    message: string,
  ) {
    super(message);
    this.name = "NagiError";
  }
}

export type NagiSession = {
  businessId: string;
  businessName: string;
  timezone: string;
  config: NagiConfig;
  calendarConnected: boolean;
  channel: NagiChannel;
  /** RLS-scoped client for the owner, reused for conversation logging. */
  supabase: AuthedClient;
  /** Everything the model needs for one turn — shared by chat and future voice. */
  model: ReturnType<ReturnType<typeof createLovableAiGatewayProvider>>;
  system: string;
  tools: ReturnType<typeof buildTools>;
};

type BusinessRow = {
  id: string;
  name: string;
  timezone: string;
  google_calendar_id?: string | null;
};

/**
 * Build a NAGI session for one business, using an already-scoped Supabase client.
 * Shared by the chat transport (owner-scoped client) and the phone channel
 * (server-side client resolved from the dialled number).
 */
export async function createNagiSessionForBusiness(
  supabase: AuthedClient,
  business: BusinessRow,
  ownerUserId: string,
  channel: NagiChannel,
): Promise<NagiSession> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new NagiError("missing_api_key", "Missing LOVABLE_API_KEY");

  const config = await getNagiConfig(supabase, business.id);
  if (!config.is_enabled) throw new NagiError("nagi_disabled", "NAGI is currently turned off");

  // Real calendar access requires both a stored connection key and a chosen calendar.
  const timezone = business.timezone || "Asia/Tokyo";
  let calendar: CalendarCtx | null = null;
  if (business.google_calendar_id) {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(ownerUserId, "google_calendar");
    if (connectionAPIKey) {
      calendar = { connectionAPIKey, calendarId: business.google_calendar_id, timezone };
    }
  }

  const gateway = createLovableAiGatewayProvider(key);

  return {
    businessId: business.id,
    businessName: business.name,
    timezone,
    config,
    calendarConnected: calendar !== null,
    channel,
    model: gateway(NAGI_MODEL),
    system: systemPrompt(business.name, timezone, config, calendar !== null, channel),
    supabase,
    tools: buildTools(supabase, business.id, calendar, timezone, config, channel),
  };
}

/**
 * Build a NAGI brain session for the authenticated owner's business.
 * Transport-agnostic: pass the Supabase access token and the channel.
 */
export async function createNagiSession(
  accessToken: string,
  channel: NagiChannel = "chat",
): Promise<NagiSession> {
  if (!accessToken) throw new NagiError("unauthorized", "Unauthorized");

  let supabase: AuthedClient;
  try {
    supabase = createUserClient(accessToken);
  } catch {
    throw new NagiError("backend_not_configured", "Backend not configured");
  }

  const { data: userData } = await supabase.auth.getUser(accessToken);
  if (!userData.user) throw new NagiError("unauthorized", "Unauthorized");

  const business = await getBusinessForUser(supabase);
  if (!business) throw new NagiError("no_business", "No business found for this account");

  return createNagiSessionForBusiness(supabase, business, userData.user.id, channel);
}

/** Run one NAGI turn as a stream (used by the chat UI transport). */
export function streamNagiReply(session: NagiSession, messages: ModelMessage[]) {
  return streamText({
    model: session.model,
    system: session.system,
    messages,
    tools: session.tools,
    stopWhen: stepCountIs(12),
  });
}

/**
 * Run one NAGI turn and return the finished text.
 * Intended for non-streaming consumers such as a future voice pipeline.
 */
export async function generateNagiReply(session: NagiSession, messages: ModelMessage[]) {
  const result = await generateText({
    model: session.model,
    system: session.system,
    messages,
    tools: session.tools,
    stopWhen: stepCountIs(12),
  });
  return result.text;
}

/** Convert AI SDK UI messages into the model messages the brain expects. */
export function toNagiMessages(messages: UIMessage[]) {
  return convertToModelMessages(messages);
}

/** Persist a finished NAGI conversation so it shows up in the owner's history. */
export async function logNagiConversation(
  session: NagiSession,
  sessionKey: string,
  transcript: string,
  summary: string | null,
) {
  await saveConversation(
    session.supabase,
    session.businessId,
    sessionKey,
    session.channel,
    transcript,
    summary,
  );
}
