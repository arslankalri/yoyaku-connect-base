/**
 * NAGI agent API (server-only).
 *
 * The receptionist brain's capabilities, exposed as plain per-business functions
 * so ANY front-end can use them: the in-app chat (via the brain), a Vapi voice
 * agent, or any other external caller. Every call is scoped to one business,
 * resolved from a per-business API key, so tenants can never see each other.
 */
import { z } from "zod";

import {
  getNagiConfig,
  get_business_hours,
  get_business_info,
  get_faqs,
  get_policies,
  get_service_details,
  get_services,
  get_staff,
  type AuthedClient,
  type NagiConfig,
} from "@/lib/nagi-data.server";
import {
  availabilityFor,
  bookAppointment,
  cancelAppointment,
  findAppointments,
  rescheduleAppointment,
  staffIdByName,
  type CalendarLink,
} from "@/lib/nagi-booking.server";
import { createNagiSessionForBusiness } from "@/lib/nagi-brain.server";
import { sanitizeToolSchema } from "@/lib/vapi-protocol";

export type AgentBusiness = {
  id: string;
  owner_id: string;
  name: string;
  timezone: string;
  google_calendar_id: string | null;
};

export type AgentContext = {
  supabase: AuthedClient;
  business: AgentBusiness;
  config: NagiConfig;
  calendar: CalendarLink;
  greeting: string;
  voiceEnabled: boolean;
};

export class AgentError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentError";
  }
}

async function adminClient(): Promise<AuthedClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AuthedClient;
}

/** Random, URL-safe per-business key. Shown once in the owner's dashboard. */
export function generateAgentKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `nagi_sk_${hex}`;
}

async function contextForBusinessId(
  supabase: AuthedClient,
  businessId: string,
): Promise<AgentContext> {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, timezone, google_calendar_id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!business) throw new AgentError(404, "Business not found");

  const config = await getNagiConfig(supabase, business.id);
  const { data: settings } = await supabase
    .from("nagi_settings")
    .select("voice_enabled, voice_greeting")
    .eq("business_id", business.id)
    .maybeSingle();

  let calendar: CalendarLink = null;
  if (business.google_calendar_id) {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(business.owner_id, "google_calendar");
    if (connectionAPIKey) {
      calendar = { connectionAPIKey, calendarId: business.google_calendar_id };
    }
  }

  return {
    supabase,
    business: {
      id: business.id,
      owner_id: business.owner_id,
      name: business.name,
      timezone: business.timezone || "Asia/Tokyo",
      google_calendar_id: business.google_calendar_id,
    },
    config,
    calendar,
    greeting: (settings?.voice_greeting ?? "").trim(),
    voiceEnabled: settings?.voice_enabled ?? false,
  };
}

/** Resolve the calling business from its API key (and record the usage). */
export async function contextForApiKey(apiKey: string): Promise<AgentContext> {
  const key = apiKey.trim();
  if (!key) throw new AgentError(401, "Missing API key");
  const supabase = await adminClient();
  const { data: row, error } = await supabase
    .from("business_api_keys")
    .select("id, business_id, revoked_at")
    .eq("api_key", key)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.revoked_at) throw new AgentError(401, "Invalid API key");

  await supabase
    .from("business_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return contextForBusinessId(supabase, row.business_id);
}

/** Fallback tenant resolution: which business owns the dialled number. */
export async function contextForPhoneNumber(number: string): Promise<AgentContext | null> {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("nagi_settings")
    .select("business_id, voice_phone_number")
    .eq("voice_enabled", true)
    .not("voice_phone_number", "is", null);
  if (error) throw error;
  const match = (data ?? []).find(
    (row) => (row.voice_phone_number ?? "").replace(/\D/g, "") === digits,
  );
  if (!match) return null;
  return contextForBusinessId(supabase, match.business_id);
}

/* ------------------------------- the tools -------------------------------- */

const dateField = z.string().describe("Date as YYYY-MM-DD in the business timezone");
const timeField = z.string().describe("Time as 24h HH:MM in the business timezone");

function requireCapability(allowed: boolean, what: string) {
  if (!allowed) throw new AgentError(403, `${what} is turned off for this business`);
}

export type AgentTool = {
  description: string;
  schema: z.ZodTypeAny;
  run: (ctx: AgentContext, args: Record<string, unknown>) => Promise<unknown>;
};

export const AGENT_TOOLS: Record<string, AgentTool> = {
  get_business_information: {
    description: "Name, phone, address, website and timezone of the business.",
    schema: z.object({}),
    run: (ctx) => get_business_info(ctx.supabase, ctx.business.id),
  },
  get_business_hours: {
    description: "Weekly opening hours (day_of_week 0 = Sunday).",
    schema: z.object({}),
    run: (ctx) => get_business_hours(ctx.supabase, ctx.business.id),
  },
  get_services: {
    description: "All active services with price and duration in minutes.",
    schema: z.object({}),
    run: (ctx) => get_services(ctx.supabase, ctx.business.id),
  },
  get_service_details: {
    description: "Price, duration and capable staff for one named service.",
    schema: z.object({ service: z.string().describe("Service name as the caller said it") }),
    run: (ctx, args) =>
      get_service_details(ctx.supabase, ctx.business.id, String(args["service"] ?? "")),
  },
  get_staff: {
    description: "Active staff with the services they provide and their working hours.",
    schema: z.object({}),
    run: (ctx) => get_staff(ctx.supabase, ctx.business.id),
  },
  search_faq: {
    description:
      "Search the business's own approved FAQ answers. Returns the closest matches, or all FAQs when no query is given.",
    schema: z.object({ query: z.string().optional().describe("What the caller asked") }),
    run: async (ctx, args) => {
      const faqs = await get_faqs(ctx.supabase, ctx.business.id);
      const query = String(args["query"] ?? "")
        .toLowerCase()
        .trim();
      if (!query) return { found: faqs.length > 0, faqs };
      const words = query.split(/\s+|、|。/).filter((w) => w.length > 1);
      const scored = faqs
        .map((faq) => {
          const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
          const score = words.reduce((sum, w) => sum + (haystack.includes(w) ? 1 : 0), 0);
          return { faq, score };
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((row) => row.faq);
      return { found: scored.length > 0, faqs: scored.length > 0 ? scored : faqs.slice(0, 3) };
    },
  },
  get_policies: {
    description: "Cancellation, late arrival and reservation policies set by the owner.",
    schema: z.object({}),
    run: (ctx) => get_policies(ctx.supabase, ctx.business.id),
  },
  check_availability: {
    description:
      "Open appointment start times on a date, honouring opening hours, existing bookings and the connected calendar. Always call before proposing or booking a time.",
    schema: z.object({
      date: dateField,
      duration_minutes: z.number().describe("Use the service duration in minutes"),
      staff: z.string().optional().describe("Staff member name, when the caller asked for one"),
    }),
    run: async (ctx, args) => {
      const staffName = args["staff"] ? String(args["staff"]) : "";
      const staffId = staffName
        ? await staffIdByName(ctx.supabase, ctx.business.id, staffName)
        : null;
      return availabilityFor(
        ctx.supabase,
        ctx.business.id,
        ctx.business.timezone,
        ctx.calendar,
        String(args["date"]),
        Number(args["duration_minutes"] ?? 30),
        staffId,
      );
    },
  },
  create_appointment: {
    description:
      "Create the real appointment. Only after check_availability showed the time is free and the caller explicitly confirmed.",
    schema: z.object({
      date: dateField,
      time: timeField,
      duration_minutes: z.number(),
      service: z.string(),
      customer_name: z.string(),
      customer_phone: z.string(),
      staff: z.string().optional(),
      notes: z.string().optional(),
    }),
    run: (ctx, args) => {
      requireCapability(ctx.config.can_accept_appointments, "Booking");
      return bookAppointment(
        ctx.supabase,
        ctx.business.id,
        ctx.business.timezone,
        ctx.calendar,
        "voice",
        {
          date: String(args["date"]),
          time: String(args["time"]),
          duration_minutes: Number(args["duration_minutes"] ?? 30),
          service: String(args["service"] ?? ""),
          customer_name: String(args["customer_name"] ?? ""),
          customer_phone: String(args["customer_phone"] ?? ""),
          staff: args["staff"] ? String(args["staff"]) : undefined,
          notes: args["notes"] ? String(args["notes"]) : undefined,
        },
      );
    },
  },
  find_appointments: {
    description: "Find a caller's upcoming appointments by phone number.",
    schema: z.object({ customer_phone: z.string() }),
    run: (ctx, args) =>
      findAppointments(
        ctx.supabase,
        ctx.business.id,
        ctx.business.timezone,
        String(args["customer_phone"] ?? ""),
      ),
  },
  modify_appointment: {
    description: "Move an existing appointment to a new date and time.",
    schema: z.object({ appointment_id: z.string(), date: dateField, time: timeField }),
    run: (ctx, args) => {
      requireCapability(ctx.config.can_change_appointments, "Changing appointments");
      return rescheduleAppointment(
        ctx.supabase,
        ctx.business.id,
        ctx.business.timezone,
        ctx.calendar,
        String(args["appointment_id"]),
        String(args["date"]),
        String(args["time"]),
      );
    },
  },
  cancel_appointment: {
    description: "Cancel an existing appointment.",
    schema: z.object({ appointment_id: z.string() }),
    run: (ctx, args) => {
      requireCapability(ctx.config.can_cancel_appointments, "Cancelling appointments");
      return cancelAppointment(
        ctx.supabase,
        ctx.business.id,
        ctx.calendar,
        String(args["appointment_id"]),
      );
    },
  },
  get_customer: {
    description: "Look up a customer by phone number.",
    schema: z.object({ phone: z.string() }),
    run: async (ctx, args) => {
      const phone = String(args["phone"] ?? "").trim();
      const { data, error } = await ctx.supabase
        .from("customers")
        .select("id, name, phone, notes")
        .eq("business_id", ctx.business.id)
        .eq("phone", phone)
        .maybeSingle();
      if (error) throw error;
      return data ? { found: true as const, customer: data } : { found: false as const };
    },
  },
  create_customer: {
    description: "Save a new customer record.",
    schema: z.object({ name: z.string(), phone: z.string(), notes: z.string().optional() }),
    run: async (ctx, args) => {
      const phone = String(args["phone"] ?? "").trim();
      const { data: existing } = await ctx.supabase
        .from("customers")
        .select("id")
        .eq("business_id", ctx.business.id)
        .eq("phone", phone)
        .maybeSingle();
      if (existing) return { created: false as const, customer_id: existing.id };
      const { data, error } = await ctx.supabase
        .from("customers")
        .insert({
          business_id: ctx.business.id,
          name: String(args["name"] ?? ""),
          phone: phone || null,
          notes: args["notes"] ? String(args["notes"]) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { created: true as const, customer_id: data.id };
    },
  },
  transfer_to_human: {
    description:
      "Flag that a staff member must follow up. Records the reason on the call so the owner sees it.",
    schema: z.object({
      reason: z.string().optional(),
      caller_phone: z.string().optional(),
      call_id: z.string().optional(),
    }),
    run: async (ctx, args) => {
      requireCapability(ctx.config.can_transfer_to_staff, "Transferring to staff");
      const callId = args["call_id"] ? String(args["call_id"]) : null;
      const reason = String(args["reason"] ?? "Staff follow-up requested");
      if (callId) {
        await ctx.supabase
          .from("calls")
          .update({ summary: `[HANDOFF] ${reason}` })
          .eq("business_id", ctx.business.id)
          .eq("session_key", callId);
      }
      return { handoff: true as const, message: "A staff member will follow up." };
    },
  },
};

/** Validate and run one tool by name. */
export async function runAgentTool(ctx: AgentContext, name: string, args: unknown) {
  const tool = AGENT_TOOLS[name];
  if (!tool) throw new AgentError(404, `Unknown tool: ${name}`);
  const parsed = tool.schema.safeParse(args ?? {});
  if (!parsed.success) {
    // Short, speakable reason: which fields are wrong, not the raw validator dump.
    const fields = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new AgentError(
      400,
      fields
        ? `Missing or invalid details for ${name}: ${fields}`
        : `Invalid arguments for ${name}`,
    );
  }

  return tool.run(ctx, (parsed.data ?? {}) as Record<string, unknown>);
}

/* ---------------------------- call transcripts ---------------------------- */

export async function saveCallLog(
  ctx: AgentContext,
  callId: string,
  fields: {
    transcript?: string;
    summary?: string | null;
    status?: string;
    from_number?: string | null;
    to_number?: string | null;
    duration_seconds?: number | null;
  },
) {
  // Read the existing row first so later events never blank out earlier data
  // (an empty transcript on a status update used to wipe a saved transcript).
  const { data: existing } = await ctx.supabase
    .from("calls")
    .select("id, transcript, summary, started_at, status")
    .eq("business_id", ctx.business.id)
    .eq("session_key", callId)
    .maybeSingle();

  const transcript = (fields.transcript ?? "").trim()
    ? (fields.transcript ?? "")
    : (existing?.transcript ?? "");

  const { error } = await ctx.supabase.from("calls").upsert(
    {
      business_id: ctx.business.id,
      channel: "voice",
      session_key: callId,
      direction: "inbound",
      status: fields.status ?? existing?.status ?? "in_progress",
      transcript,
      started_at: existing?.started_at ?? new Date().toISOString(),
      ...(fields.summary !== undefined && fields.summary !== null
        ? { summary: fields.summary }
        : {}),
      ...(fields.from_number ? { from_number: fields.from_number } : {}),
      ...(fields.to_number ? { to_number: fields.to_number } : {}),
      ...(fields.duration_seconds !== undefined && fields.duration_seconds !== null
        ? { duration_seconds: fields.duration_seconds }
        : {}),
    },
    { onConflict: "business_id,session_key" },
  );
  if (error) throw error;
}

/* --------------------------- voice agent settings -------------------------- */

/** JSON-Schema shape of one tool, for providers that need declarations. */
export function toolDeclarations() {
  return Object.entries(AGENT_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    // Vapi rejects an assistant whose tool parameters carry JSON-Schema meta
    // keys such as `$schema`, so strip them down to the accepted subset.
    parameters: sanitizeToolSchema(z.toJSONSchema(tool.schema, { io: "input" })),
  }));
}

export function defaultVoiceGreeting(businessName: string, custom: string) {
  if (custom) return custom;
  return `お電話ありがとうございます。${businessName}のAI受付、ナギです。ご用件をお伺いします。`;
}

/**
 * The receptionist instructions the voice provider should use. This is the exact
 * same prompt the in-app chat brain runs on, so phone and chat behave identically.
 */
export async function voiceSystemPrompt(ctx: AgentContext) {
  const session = await createNagiSessionForBusiness(
    ctx.supabase,
    {
      id: ctx.business.id,
      name: ctx.business.name,
      timezone: ctx.business.timezone,
      google_calendar_id: ctx.business.google_calendar_id,
    },
    ctx.business.owner_id,
    "voice",
  );
  return session.system;
}
