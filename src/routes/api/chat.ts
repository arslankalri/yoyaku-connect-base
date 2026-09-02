import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
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
  createEvent,
  checkAvailability,
  listEvents,
  zonedToUtc,
} from "@/server/googleCalendar.server";


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
) {
  const calendarTools = calendar ? buildCalendarTools(supabase, businessId, calendar) : {};
  return {
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
      description: "List all active services with price (JPY), duration in minutes and description.",
      inputSchema: z.object({}),
      execute: async () => get_services(supabase, businessId),
    }),
    get_service_details: tool({
      description:
        "Get the price, duration, description and capable staff for one named service. Use for questions like 'how much is a cut?'.",
      inputSchema: z.object({ service: z.string().describe("Service name as the customer said it") }),
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

function buildCalendarTools(
  supabase: AuthedClient,
  businessId: string,
  calendar: CalendarCtx,
) {
  const { connectionAPIKey, calendarId, timezone } = calendar;
  const dateSchema = z.string().describe("Date in YYYY-MM-DD (business timezone)");
  const timeSchema = z.string().describe("Time in 24h HH:MM (business timezone)");

  

  return {
    check_calendar_availability: tool({
      description:
        "Check open appointment start times on a date, using the business opening hours and the owner's Google Calendar. Always call before proposing or booking a time.",
      inputSchema: z.object({
        date: dateSchema,
        duration_minutes: z
          .number()
          .describe("Appointment length in minutes (use the service duration)"),
      }),
      execute: async ({ date, duration_minutes }) =>
        checkAvailability(
          supabase,
          businessId,
          connectionAPIKey,
          calendarId,
          timezone,
          date,
          duration_minutes,
        ),
    }),
    list_calendar_events: tool({
      description:
        "Read existing calendar events between two dates (inclusive start, exclusive end) to see what is already scheduled.",
      inputSchema: z.object({ from_date: dateSchema, to_date: dateSchema }),
      execute: async ({ from_date, to_date }) =>
        listEvents(
          connectionAPIKey,
          calendarId,
          zonedToUtc(from_date, "00:00", timezone).toISOString(),
          zonedToUtc(to_date, "23:59", timezone).toISOString(),
        ),
    }),
    create_calendar_appointment: tool({
      description:
        "Create the appointment in the owner's Google Calendar. Only call after check_calendar_availability showed the slot is free AND the customer explicitly confirmed the booking.",
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
      execute: async (input) => {
        const start = zonedToUtc(input.date, input.time, timezone);
        const end = new Date(start.getTime() + Math.max(5, input.duration_minutes) * 60_000);
        const created = await createEvent(connectionAPIKey, calendarId, {
          summary: `${input.service} — ${input.customer_name}`,
          description: [
            `Service: ${input.service}`,
            `Customer: ${input.customer_name}`,
            `Phone: ${input.customer_phone}`,
            input.staff ? `Staff: ${input.staff}` : null,
            input.notes ? `Notes: ${input.notes}` : null,
            "Booked by NAGI AI receptionist.",
          ]
            .filter(Boolean)
            .join("\n"),
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          timeZone: timezone,
        });
        return {
          created: true,
          event_id: created.id,
          date: input.date,
          time: input.time,
          duration_minutes: input.duration_minutes,
        };
      },
    }),
  };
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
  if (config.handoff_manual_enabled)
    reasons.push("you judge that a staff member should take over");
  return reasons.length > 0 ? reasons.map((r) => `- ${r}`).join("\n") : "- (no handoff rules configured)";
}



function systemPrompt(
  businessName: string,
  timezone: string,
  config: NagiConfig,
  calendarConnected: boolean,
) {
  const custom = config.custom_instructions.trim();
  return `You are NAGI (ナギ), the AI receptionist of "${businessName}". You are answering a customer in a text chat that simulates a phone call.

PERSONALITY
- Warm, polite, calm, helpful, concise, natural.
- ${toneLine(config.tone)}
- In Japanese, use natural polite business Japanese (丁寧語・敬語), never robotic translation.
- ALWAYS reply in the same language the customer used in their latest message. Never translate business data (service names, staff names, FAQ answers, policies) — quote them exactly as stored.
- Keep replies short: 1–3 sentences, like a real receptionist on the phone. No markdown headings and no emoji.
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

HUMAN HANDOFF (simulated — no real transfer system is connected)
Request staff assistance when:
${handoffRules(config)}
- To hand off, put the token [[HANDOFF]] on the FIRST line, then a short polite message.
  Japanese: 「スタッフへの確認が必要です。担当者よりご連絡いたします。」 English: "A staff member needs to assist with this. Our team will follow up with you."
- NEVER say you have transferred, connected or put the customer through to a person — no transfer system exists yet.

APPOINTMENTS
${calendarConnected ? `- The owner's Google Calendar IS connected, so you can check REAL availability — but you must NEVER create, move or cancel any calendar event. You have no tool to do so.
- When a customer asks for an appointment: (1) identify the service with get_services / get_service_details to get its duration, (2) identify the exact date and time (ask if vague, e.g. "afternoon"; resolve 明日/tomorrow using the date context), (3) call check_calendar_availability for that date with the service duration — it already accounts for opening hours and calendar conflicts.
- If the requested time appears in available_slots, tell the customer it is available. Japanese example: 「明日の15時でしたら空いております。」
- If it is not available, apologise and offer 2-3 nearby times from available_slots. Japanese example: 「申し訳ありません。15時は埋まっています。14時または16時はいかがでしょうか？」 If the day is closed or has no slots, say so and suggest another day.
- Never offer a time that is not in available_slots, and never invent availability without calling the tool.
- Do NOT book yet: after confirming availability, explain politely that a staff member will finalise the reservation. Never say a booking, change or cancellation has been made.` : `- No calendar is connected, so you CANNOT create, change or cancel real appointments and must never claim one was made, changed or cancelled.
- If accepting appointment requests is ENABLED: collect the missing details conversationally, one question at a time: service, date, time, staff preference (if staff exist), customer name, phone number. If a time is vague (e.g. "afternoon"), ask for a specific time. Once you have service + date + time + name + phone, do NOT confirm a booking — output on the FIRST line exactly the token [[BOOKING_SIM]] and then a short polite message explaining this is a test and staff will confirm.
- For change or cancellation requests (when enabled), gather details, quote the configured policy, and explain that staff will confirm; never state it is done.`}`;
}


export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let supabase: AuthedClient;
        try {
          supabase = createUserClient(token);
        } catch {
          return new Response("Backend not configured", { status: 500 });
        }

        const { data: userData } = await supabase.auth.getUser(token);
        if (!userData.user) return new Response("Unauthorized", { status: 401 });

        const business = await getBusinessForUser(supabase);
        if (!business) return new Response("No business found for this account", { status: 404 });

        const config = await getNagiConfig(supabase, business.id);
        if (!config.is_enabled) return new Response("NAGI is currently turned off", { status: 403 });

        // Real calendar access requires both a stored connection key and a chosen calendar.
        let calendar: CalendarCtx | null = null;
        const timezone = business.timezone || "Asia/Tokyo";
        if (business.google_calendar_id) {
          const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
          const connectionAPIKey = await getConnectionKeyForUser(
            userData.user.id,
            "google_calendar",
          );
          if (connectionAPIKey) {
            calendar = {
              connectionAPIKey,
              calendarId: business.google_calendar_id,
              timezone,
            };
          }
        }

        const gateway = createLovableAiGatewayProvider(key);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: systemPrompt(business.name, timezone, config, calendar !== null),

            messages: await convertToModelMessages(body.messages as UIMessage[]),
            tools: buildTools(supabase, business.id, calendar),
            stopWhen: stepCountIs(12),
          });
          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
