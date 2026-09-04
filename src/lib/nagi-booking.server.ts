/**
 * Real appointment operations for NAGI (server-only).
 *
 * Availability, booking, rescheduling and cancellation all run against the
 * owner's own database rows (RLS-scoped) and, when connected, the owner's
 * Google Calendar. Nothing here is simulated.
 */
import type { AuthedClient } from "@/lib/nagi-data.server";
import {
  createEvent,
  dayOfWeekInZone,
  deleteEvent,
  updateEvent,
  utcToZonedTime,
  zonedToUtc,
} from "@/server/googleCalendar.server";

export type CalendarLink = { connectionAPIKey: string; calendarId: string } | null;

const ACTIVE_STATUSES = ["pending", "confirmed"] as const;

async function googleBusy(
  calendar: CalendarLink,
  timeMin: string,
  timeMax: string,
  timeZone: string,
) {
  if (!calendar) return [] as Array<{ start: number; end: number }>;
  const { GATEWAY_BASE_URL } = await import("@/server/googleCalendar.server");
  void GATEWAY_BASE_URL; // keep the import graph explicit for the gateway module
  const { listEvents } = await import("@/server/googleCalendar.server");
  const events = await listEvents(calendar.connectionAPIKey, calendar.calendarId, timeMin, timeMax);
  return (events as Array<{ start?: string; end?: string }>)
    .filter((e) => e.start && e.end)
    .map((e) => ({ start: new Date(e.start!).getTime(), end: new Date(e.end!).getTime() }));
  void timeZone;
}

/** Free start times on `date`, honouring opening hours, existing appointments and calendar events. */
export async function availabilityFor(
  supabase: AuthedClient,
  businessId: string,
  timeZone: string,
  calendar: CalendarLink,
  date: string,
  durationMinutes: number,
) {
  const dow = dayOfWeekInZone(date, timeZone);
  const { data: hours, error } = await supabase
    .from("business_hours")
    .select("is_open, open_time, close_time")
    .eq("business_id", businessId)
    .eq("day_of_week", dow)
    .maybeSingle();
  if (error) throw error;
  if (!hours || !hours.is_open) {
    return { date, day_of_week: dow, is_open: false as const, available_slots: [] as string[] };
  }

  const open = hours.open_time.slice(0, 5);
  const close = hours.close_time.slice(0, 5);
  const dayStart = zonedToUtc(date, open, timeZone);
  const dayEnd = zonedToUtc(date, close, timeZone);

  const { data: booked, error: bookedError } = await supabase
    .from("appointments")
    .select("starts_at, ends_at, status")
    .eq("business_id", businessId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .gte("starts_at", new Date(dayStart.getTime() - 12 * 3_600_000).toISOString())
    .lte("starts_at", dayEnd.toISOString());
  if (bookedError) throw bookedError;

  const blocks = [
    ...(booked ?? []).map((a) => ({
      start: new Date(a.starts_at).getTime(),
      end: new Date(a.ends_at).getTime(),
    })),
    ...(await googleBusy(calendar, dayStart.toISOString(), dayEnd.toISOString(), timeZone)),
  ];

  const step = 30 * 60_000;
  const duration = Math.max(5, durationMinutes) * 60_000;
  const now = Date.now();
  const slots: string[] = [];
  for (let t = dayStart.getTime(); t + duration <= dayEnd.getTime(); t += step) {
    if (t < now) continue;
    if (blocks.some((b) => t < b.end && t + duration > b.start)) continue;
    slots.push(utcToZonedTime(new Date(t), timeZone));
  }

  return {
    date,
    day_of_week: dow,
    is_open: true as const,
    open_time: open,
    close_time: close,
    timezone: timeZone,
    duration_minutes: durationMinutes,
    available_slots: slots,
  };
}

async function upsertCustomer(
  supabase: AuthedClient,
  businessId: string,
  name: string,
  phone: string,
) {
  const trimmed = phone.trim();
  if (trimmed) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("phone", trimmed)
      .maybeSingle();
    if (existing) {
      if (existing.name !== name) {
        await supabase.from("customers").update({ name }).eq("id", existing.id);
      }
      return existing.id;
    }
  }
  const { data, error } = await supabase
    .from("customers")
    .insert({ business_id: businessId, name, phone: trimmed || null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function resolveIds(
  supabase: AuthedClient,
  businessId: string,
  serviceName: string,
  staffName?: string | undefined,
) {
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes")
    .eq("business_id", businessId)
    .eq("is_active", true);
  const needle = serviceName.trim().toLowerCase();
  const service =
    (services ?? []).find((s) => s.name.toLowerCase() === needle) ??
    (services ?? []).find(
      (s) => s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase()),
    ) ??
    null;

  let staffId: string | null = null;
  if (staffName?.trim()) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("is_active", true);
    const sNeedle = staffName.trim().toLowerCase();
    staffId =
      (staff ?? []).find((s) => s.name.toLowerCase() === sNeedle)?.id ??
      (staff ?? []).find((s) => s.name.toLowerCase().includes(sNeedle))?.id ??
      null;
  }
  return { service, staffId };
}

export type BookingInput = {
  date: string;
  time: string;
  duration_minutes: number;
  service: string;
  customer_name: string;
  customer_phone: string;
  staff?: string | undefined;
  notes?: string | undefined;
};

/** Create a real appointment row (and calendar event when connected). */
export async function bookAppointment(
  supabase: AuthedClient,
  businessId: string,
  timeZone: string,
  calendar: CalendarLink,
  channel: string,
  input: BookingInput,
) {
  const { service, staffId } = await resolveIds(supabase, businessId, input.service, input.staff);
  const duration = Math.max(5, service?.duration_minutes ?? input.duration_minutes);

  const slots = await availabilityFor(
    supabase,
    businessId,
    timeZone,
    calendar,
    input.date,
    duration,
  );
  if (!slots.is_open || !slots.available_slots.includes(input.time)) {
    return {
      created: false as const,
      reason: "slot_unavailable",
      available_slots: slots.available_slots,
    };
  }

  const start = zonedToUtc(input.date, input.time, timeZone);
  const end = new Date(start.getTime() + duration * 60_000);
  const customerId = await upsertCustomer(
    supabase,
    businessId,
    input.customer_name,
    input.customer_phone,
  );

  let eventId: string | null = null;
  if (calendar) {
    const created = await createEvent(calendar.connectionAPIKey, calendar.calendarId, {
      summary: `${service?.name ?? input.service} — ${input.customer_name}`,
      description: [
        `Service: ${service?.name ?? input.service}`,
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
      timeZone,
    });
    eventId = created.id ?? null;
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      staff_id: staffId,
      service_id: service?.id ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      source: channel === "voice" ? "nagi_voice" : "nagi_chat",
      external_calendar_event_id: eventId,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  return {
    created: true as const,
    appointment_id: data.id,
    date: input.date,
    time: input.time,
    duration_minutes: duration,
    service: service?.name ?? input.service,
    calendar_synced: !!eventId,
  };
}

/** Find a customer's upcoming appointments by phone number. */
export async function findAppointments(
  supabase: AuthedClient,
  businessId: string,
  timeZone: string,
  phone: string,
) {
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("phone", phone.trim());
  if (!customers || customers.length === 0) return { found: false as const, appointments: [] };

  const ids = customers.map((c) => c.id);
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, service_id, services(name)")
    .eq("business_id", businessId)
    .in("customer_id", ids)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;

  return {
    found: (data ?? []).length > 0,
    appointments: (data ?? []).map((a) => ({
      appointment_id: a.id,
      date: new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(a.starts_at)),
      time: utcToZonedTime(new Date(a.starts_at), timeZone),
      status: a.status,
      service: (a.services as { name: string } | null)?.name ?? null,
    })),
  };
}

export async function rescheduleAppointment(
  supabase: AuthedClient,
  businessId: string,
  timeZone: string,
  calendar: CalendarLink,
  appointmentId: string,
  date: string,
  time: string,
) {
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, external_calendar_event_id")
    .eq("business_id", businessId)
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (!appt) return { updated: false as const, reason: "not_found" };

  const duration = Math.round(
    (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60_000,
  );
  const slots = await availabilityFor(supabase, businessId, timeZone, calendar, date, duration);
  if (!slots.is_open || !slots.available_slots.includes(time)) {
    return {
      updated: false as const,
      reason: "slot_unavailable",
      available_slots: slots.available_slots,
    };
  }

  const start = zonedToUtc(date, time, timeZone);
  const end = new Date(start.getTime() + duration * 60_000);
  if (calendar && appt.external_calendar_event_id) {
    await updateEvent(calendar.connectionAPIKey, calendar.calendarId, appt.external_calendar_event_id, {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      timeZone,
    });
  }
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ starts_at: start.toISOString(), ends_at: end.toISOString() })
    .eq("id", appointmentId);
  if (updateError) throw updateError;
  return { updated: true as const, date, time, duration_minutes: duration };
}

export async function cancelAppointment(
  supabase: AuthedClient,
  businessId: string,
  calendar: CalendarLink,
  appointmentId: string,
) {
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("id, external_calendar_event_id")
    .eq("business_id", businessId)
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (!appt) return { cancelled: false as const, reason: "not_found" };

  if (calendar && appt.external_calendar_event_id) {
    await deleteEvent(calendar.connectionAPIKey, calendar.calendarId, appt.external_calendar_event_id);
  }
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  if (updateError) throw updateError;
  return { cancelled: true as const };
}

/** Persist a NAGI conversation so it appears in the owner's conversation history. */
export async function saveConversation(
  supabase: AuthedClient,
  businessId: string,
  sessionKey: string,
  channel: string,
  transcript: string,
  summary: string | null,
) {
  const { error } = await supabase.from("calls").upsert(
    {
      business_id: businessId,
      channel,
      session_key: sessionKey,
      direction: "inbound",
      status: "completed",
      transcript,
      summary,
      started_at: new Date().toISOString(),
    },
    { onConflict: "business_id,session_key" },
  );
  if (error) throw error;
}
