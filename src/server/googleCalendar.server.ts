import { callAsAppUser } from "@/integrations/lovable/appUserConnector";
import type { AuthedClient } from "@/lib/nagi-data.server";

/**
 * Server-only Google Calendar access for the business owner's own calendar.
 *
 * Every call runs through the Lovable connector gateway with the owner's
 * per-user connection key, so no Google token ever reaches the browser.
 * Availability always uses the business timezone and stored business hours.
 */

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const GOOGLE_CALENDAR_CONNECTOR_ID = "google_calendar";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

async function gcal(
  connectionAPIKey: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_CALENDAR_CONNECTOR_ID,
    path: `/calendar/v3${path}`,
    init,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Google Calendar request failed [${res.status}]: ${text}`);
    throw new Error(`Google Calendar request failed [${res.status}]: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

/* ---------------------------- timezone helpers ---------------------------- */

function offsetMinutes(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/** Convert a wall-clock date/time in `timeZone` into a UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  let guess = new Date(wall);
  for (let i = 0; i < 2; i += 1) {
    guess = new Date(wall - offsetMinutes(guess, timeZone) * 60_000);
  }
  return guess;
}

/** Wall-clock HH:MM of a UTC instant inside `timeZone`. */
export function utcToZonedTime(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

export function dayOfWeekInZone(date: string, timeZone: string) {
  const noon = zonedToUtc(date, "12:00", timeZone);
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return Math.max(0, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short));
}

/* ------------------------------- calendars -------------------------------- */

type CalendarListResponse = {
  items?: Array<{ id: string; summary?: string; primary?: boolean; accessRole?: string }>;
};

export async function listCalendars(connectionAPIKey: string) {
  const body = (await gcal(connectionAPIKey, "/users/me/calendarList")) as CalendarListResponse;
  return (body.items ?? [])
    .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
    .map((c) => ({ id: c.id, summary: c.summary ?? c.id, primary: !!c.primary }));
}

/* --------------------------------- events --------------------------------- */

type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export async function listEvents(
  connectionAPIKey: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const body = (await gcal(
    connectionAPIKey,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
  )) as { items?: GoogleEvent[] };
  return (body.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      title: e.summary ?? "(no title)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
    }));
}

export async function createEvent(
  connectionAPIKey: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    startIso: string;
    endIso: string;
    timeZone: string;
  },
) {
  const body = (await gcal(
    connectionAPIKey,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startIso, timeZone: event.timeZone },
        end: { dateTime: event.endIso, timeZone: event.timeZone },
      }),
    },
  )) as GoogleEvent;
  return { id: body.id, title: body.summary ?? event.summary };
}

export async function updateEvent(
  connectionAPIKey: string,
  calendarId: string,
  eventId: string,
  patch: {
    summary?: string;
    description?: string;
    startIso?: string;
    endIso?: string;
    timeZone: string;
  },
) {
  const payload: Record<string, unknown> = {};
  if (patch.summary) payload["summary"] = patch.summary;
  if (patch.description) payload["description"] = patch.description;
  if (patch.startIso) payload["start"] = { dateTime: patch.startIso, timeZone: patch.timeZone };
  if (patch.endIso) payload["end"] = { dateTime: patch.endIso, timeZone: patch.timeZone };
  const body = (await gcal(
    connectionAPIKey,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )) as GoogleEvent;
  return { id: body.id, title: body.summary ?? null };
}

export async function deleteEvent(
  connectionAPIKey: string,
  calendarId: string,
  eventId: string,
) {
  await gcal(
    connectionAPIKey,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  return { cancelled: true as const };
}

/* ------------------------------ availability ------------------------------ */

async function busyPeriods(
  connectionAPIKey: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  timeZone: string,
) {
  const body = (await gcal(connectionAPIKey, "/freeBusy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, timeZone, items: [{ id: calendarId }] }),
  })) as { calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }> };
  return body.calendars?.[calendarId]?.busy ?? [];
}

/**
 * Free start times on `date` for a `durationMinutes` appointment, limited to the
 * business's opening hours for that weekday in the business timezone.
 */
export async function checkAvailability(
  supabase: AuthedClient,
  businessId: string,
  connectionAPIKey: string,
  calendarId: string,
  timeZone: string,
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

  const busy = await busyPeriods(
    connectionAPIKey,
    calendarId,
    dayStart.toISOString(),
    dayEnd.toISOString(),
    timeZone,
  );
  const blocks = busy.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const step = 30 * 60_000;
  const duration = Math.max(5, durationMinutes) * 60_000;
  const now = Date.now();
  const slots: string[] = [];
  for (let t = dayStart.getTime(); t + duration <= dayEnd.getTime(); t += step) {
    if (t < now) continue;
    const overlaps = blocks.some((b) => t < b.end && t + duration > b.start);
    if (!overlaps) slots.push(utcToZonedTime(new Date(t), timeZone));
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
