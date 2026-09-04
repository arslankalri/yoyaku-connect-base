import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2, Plug, Unplug } from "lucide-react";
import { toast } from "sonner";

import { OnlineDot } from "@/components/ai-background";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  completeGoogleCalendarConnect,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  selectGoogleCalendar,
  startGoogleCalendarConnect,
} from "@/lib/google-calendar.functions";
import { useI18n } from "@/lib/i18n";

const CONNECTOR_ID = "google_calendar";

/** Wait for the popup's same-origin completion message and return the one-time code. */
function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };

    const onMessage = (event: MessageEvent) => {
      const type = (event.data as { type?: string } | null)?.type;
      const data = event.data as { connectorId?: string; code?: unknown } | null;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        data?.connectorId !== CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof data?.code === "string" ? data.code : null);
        return;
      }
      popup.close();
      reject(new Error("OAuth connection failed."));
    };
    window.addEventListener("message", onMessage);
    const poll: number | undefined = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("OAuth window closed before completion."));
    }, 500);
  });
}

export function GoogleCalendarPanel({ businessId }: { businessId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const status = useServerFn(getGoogleCalendarStatus);
  const startConnect = useServerFn(startGoogleCalendarConnect);
  const complete = useServerFn(completeGoogleCalendarConnect);
  const pickCalendar = useServerFn(selectGoogleCalendar);
  const disconnect = useServerFn(disconnectGoogleCalendar);

  const statusQuery = useQuery({
    queryKey: ["google_calendar_status", businessId],
    queryFn: () => status(),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "nagi-google-calendar", "width=600,height=720");
      if (!popup) throw new Error("popup-blocked");
      let code: string | null;
      try {
        const { authorizationUrl } = await startConnect();
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = authorizationUrl;
        code = await completion;
      } catch (error) {
        popup.close();
        throw error;
      }
      if (code) await complete({ data: { code } });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["google_calendar_status"] });
      toast.success(t("gcal.connected"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message === "popup-blocked"
          ? t("gcal.popupBlocked")
          : t("gcal.connectFailed"),
      );
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (calendarId: string) => {
      const match = (statusQuery.data?.calendars ?? []).find((c) => c.id === calendarId);
      await pickCalendar({
        data: { businessId, calendarId, summary: match?.summary ?? calendarId },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["google_calendar_status"] });
      toast.success(t("gcal.calendarSaved"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect({ data: { businessId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["google_calendar_status"] });
      toast.success(t("gcal.disconnected"));
    },
    onError: () => toast.error(t("common.error")),
  });

  if (statusQuery.isLoading) return <LoadingPanel rows={3} />;
  if (statusQuery.isError) return <ErrorPanel onRetry={() => statusQuery.refetch()} />;

  const data = statusQuery.data!;
  const connected = data.connected;
  const ready = connected && !!data.selected_calendar_id;

  return (
    <section className="glass-panel p-5">
      <p className="eyebrow flex items-center gap-1.5">
        <CalendarDays className="size-3.5" />
        {t("gcal.title")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t("gcal.desc")}</p>

      <p className="mt-4 flex items-center gap-2 text-sm">
        {ready ? (
          <>
            <OnlineDot />
            <span className="font-medium text-success">{t("gcal.statusConnected")}</span>
            <span className="text-muted-foreground">
              · {data.selected_calendar_summary ?? data.selected_calendar_id}
            </span>
          </>
        ) : connected ? (
          <span className="font-medium text-warning-foreground">
            {t("gcal.statusPickCalendar")}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("gcal.statusNotConnected")}</span>
        )}
      </p>

      {data.error && <p className="mt-2 text-xs text-destructive">{data.error}</p>}

      {connected && (
        <div className="mt-4 max-w-md">
          <Label htmlFor="gcal-select" className="text-sm font-medium">
            {t("gcal.selectLabel")}
          </Label>
          <Select
            {...(data.selected_calendar_id ? { value: data.selected_calendar_id } : {})}
            onValueChange={(value) => selectMutation.mutate(value)}
          >
            <SelectTrigger id="gcal-select" className="mt-2 bg-background/70">
              <SelectValue placeholder={t("gcal.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {data.calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? ` · ${t("gcal.primary")}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!connected ? (
          <Button
            size="sm"
            disabled={connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plug className="size-4" />
            )}
            {t("gcal.connect")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={disconnectMutation.isPending}
            onClick={() => disconnectMutation.mutate()}
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unplug className="size-4" />
            )}
            {t("gcal.disconnect")}
          </Button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("gcal.note")}</p>
    </section>
  );
}
