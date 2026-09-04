import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * Server-only data access for the NAGI receptionist.
 *
 * Every function runs through a Supabase client authenticated as the signed-in
 * business owner, so Row Level Security guarantees a conversation can only ever
 * read the caller's own business data.
 */

export type AuthedClient = SupabaseClient<Database>;

export const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** Create a Supabase client that acts as the user behind `accessToken`. */
export function createUserClient(accessToken: string): AuthedClient {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server environment variables");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function hhmm(value: string | null | undefined) {
  return (value ?? "").slice(0, 5);
}

export async function getBusinessForUser(supabase: AuthedClient) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, phone, postal_code, address, website, timezone, google_calendar_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function get_business_info(supabase: AuthedClient, businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("name, phone, postal_code, address, website, timezone")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { found: false as const };
  return {
    found: true as const,
    name: data.name,
    phone: data.phone ?? null,
    address:
      [data.postal_code ? `〒${data.postal_code}` : null, data.address].filter(Boolean).join(" ") ||
      null,
    website: data.website ?? null,
    timezone: data.timezone,
  };
}

export async function get_business_hours(supabase: AuthedClient, businessId: string) {
  const { data, error } = await supabase
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", businessId)
    .order("day_of_week");
  if (error) throw error;
  return (data ?? []).map((h) => ({
    day_of_week: h.day_of_week,
    day_en: DAY_NAMES_EN[h.day_of_week],
    day_ja: `${DAY_NAMES_JA[h.day_of_week]}曜日`,
    is_open: h.is_open,
    open_time: h.is_open ? hhmm(h.open_time) : null,
    close_time: h.is_open ? hhmm(h.close_time) : null,
  }));
}

export async function get_services(supabase: AuthedClient, businessId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("name, description, price, currency, duration_minutes")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function get_service_details(
  supabase: AuthedClient,
  businessId: string,
  service: string,
) {
  const all = await get_services(supabase, businessId);
  const needle = service.trim().toLowerCase();
  const match =
    all.find((s) => s.name.toLowerCase() === needle) ??
    all.find((s) => s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase()));
  if (!match) {
    return { found: false as const, available_services: all.map((s) => s.name) };
  }
  const staff = await get_staff_for_service(supabase, businessId, match.name);
  return { found: true as const, ...match, staff };
}

export async function get_staff(supabase: AuthedClient, businessId: string) {
  const { data, error } = await supabase
    .from("staff")
    .select(
      "name, is_active, staff_services(service_id), staff_working_hours(day_of_week, is_working, start_time, end_time)",
    )
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;

  const services = await supabase.from("services").select("id, name").eq("business_id", businessId);

  const nameById = new Map((services.data ?? []).map((s) => [s.id, s.name]));

  return (data ?? []).map((m) => ({
    name: m.name,
    services: (m.staff_services ?? [])
      .map((link) => nameById.get(link.service_id))
      .filter((n): n is string => !!n),
    working_hours: (m.staff_working_hours ?? [])
      .slice()
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map((h) => ({
        day_en: DAY_NAMES_EN[h.day_of_week],
        day_ja: `${DAY_NAMES_JA[h.day_of_week]}曜日`,
        is_working: h.is_working,
        start_time: h.is_working ? hhmm(h.start_time) : null,
        end_time: h.is_working ? hhmm(h.end_time) : null,
      })),
  }));
}

export async function get_staff_services(
  supabase: AuthedClient,
  businessId: string,
  staffName: string,
) {
  const all = await get_staff(supabase, businessId);
  const needle = staffName.trim().toLowerCase();
  const match =
    all.find((m) => m.name.toLowerCase() === needle) ??
    all.find((m) => m.name.toLowerCase().includes(needle));
  if (!match) return { found: false as const, available_staff: all.map((m) => m.name) };
  return { found: true as const, name: match.name, services: match.services };
}

async function get_staff_for_service(
  supabase: AuthedClient,
  businessId: string,
  serviceName: string,
) {
  const all = await get_staff(supabase, businessId);
  return all.filter((m) => m.services.includes(serviceName)).map((m) => m.name);
}

/** Counts used by the "business data connected" status panel. */
export async function getDataStatus(supabase: AuthedClient, businessId: string) {
  const [hours, services, staff] = await Promise.all([
    get_business_hours(supabase, businessId),
    get_services(supabase, businessId),
    get_staff(supabase, businessId),
  ]);
  return {
    hours: hours.filter((h) => h.is_open).length,
    services: services.length,
    staff: staff.length,
  };
}

/* ------------------------------------------------------------------ */
/* NAGI configuration (Control Center)                                 */
/* ------------------------------------------------------------------ */

export type NagiConfig = {
  is_enabled: boolean;
  tone: string;
  custom_instructions: string;
  can_answer_faqs: boolean;
  can_explain_services: boolean;
  can_explain_prices: boolean;
  can_explain_hours: boolean;
  can_accept_appointments: boolean;
  can_change_appointments: boolean;
  can_cancel_appointments: boolean;
  can_transfer_to_staff: boolean;
  handoff_on_request: boolean;
  handoff_on_unknown: boolean;
  handoff_on_complaint: boolean;
  handoff_outside_scope: boolean;
  handoff_manual_enabled: boolean;
  cancellation_policy: string;
  late_arrival_policy: string;
  reservation_policy: string;
  other_policies: string;
};

const DEFAULT_CONFIG: NagiConfig = {
  is_enabled: true,
  tone: "professional",
  custom_instructions: "",
  can_answer_faqs: true,
  can_explain_services: true,
  can_explain_prices: true,
  can_explain_hours: true,
  can_accept_appointments: true,
  can_change_appointments: true,
  can_cancel_appointments: true,
  can_transfer_to_staff: true,
  handoff_on_request: true,
  handoff_on_unknown: true,
  handoff_on_complaint: true,
  handoff_outside_scope: true,
  handoff_manual_enabled: false,
  cancellation_policy: "",
  late_arrival_policy: "",
  reservation_policy: "",
  other_policies: "",
};

/** Load the owner's NAGI configuration, falling back to defaults when unset. */
export async function getNagiConfig(
  supabase: AuthedClient,
  businessId: string,
): Promise<NagiConfig> {
  const { data, error } = await supabase
    .from("nagi_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...(data as Partial<NagiConfig>) };
}

export async function get_faqs(supabase: AuthedClient, businessId: string) {
  const { data, error } = await supabase
    .from("faqs")
    .select("question, answer")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function get_policies(supabase: AuthedClient, businessId: string) {
  const config = await getNagiConfig(supabase, businessId);
  const policies = {
    cancellation: config.cancellation_policy.trim() || null,
    late_arrival: config.late_arrival_policy.trim() || null,
    reservation: config.reservation_policy.trim() || null,
    other: config.other_policies.trim() || null,
  };
  const any = Object.values(policies).some(Boolean);
  return { found: any, ...policies };
}
