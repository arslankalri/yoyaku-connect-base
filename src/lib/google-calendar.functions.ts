import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Google Calendar connection management for the signed-in business owner.
 *
 * Server-only modules are imported inside the handlers so the connector
 * secrets never enter a client bundle.
 */

const CONNECTOR_ID = "google_calendar";
const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientApiKey = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientApiKey) {
      throw new Error("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY is not set");
    }
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-calendar/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { GOOGLE_CALENDAR_SCOPES } = await import("@/server/googleCalendar.server");

    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientApiKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: GOOGLE_CALENDAR_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) {
      throw new Error("OAuth completion returned the wrong connector");
    }
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true as const };
  });

/** Connection status plus the calendars the owner can write to. */
export const getGoogleCalendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { data: business } = await context.supabase
      .from("businesses")
      .select("id, google_calendar_id, google_calendar_summary")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!connectionAPIKey) {
      return {
        connected: false as const,
        calendars: [] as Array<{ id: string; summary: string; primary: boolean }>,
        selected_calendar_id: null,
        selected_calendar_summary: null,
        error: null as string | null,
      };
    }

    const { listCalendars } = await import("@/server/googleCalendar.server");
    try {
      const calendars = await listCalendars(connectionAPIKey);
      return {
        connected: true as const,
        calendars,
        selected_calendar_id: business?.google_calendar_id ?? null,
        selected_calendar_summary: business?.google_calendar_summary ?? null,
        error: null as string | null,
      };
    } catch (error) {
      return {
        connected: true as const,
        calendars: [] as Array<{ id: string; summary: string; primary: boolean }>,
        selected_calendar_id: business?.google_calendar_id ?? null,
        selected_calendar_summary: business?.google_calendar_summary ?? null,
        error: error instanceof Error ? error.message : "Google Calendar request failed",
      };
    }
  });

export const selectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; calendarId: string; summary: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("businesses")
      .update({ google_calendar_id: data.calendarId, google_calendar_summary: data.summary })
      .eq("id", data.businessId);
    if (error) throw error;
    return { ok: true as const };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (connectionAPIKey) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey,
          connectorId: CONNECTOR_ID,
        });
      } catch (error) {
        console.error("Google Calendar gateway disconnect failed", error);
      }
      await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    }
    await context.supabase
      .from("businesses")
      .update({ google_calendar_id: null, google_calendar_summary: null })
      .eq("id", data.businessId);
    return { ok: true as const };
  });
