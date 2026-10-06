import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  PhoneOff,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useBusiness,
  useMarkNotificationsRead,
  useNotifications,
  useRealtime,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications / お知らせ — NAGI AI" },
      {
        name: "description",
        content: "Bookings, cancellations, finished calls and staff follow-ups from NAGI.",
      },
      { property: "og:title", content: "Notifications / お知らせ — NAGI AI" },
      {
        property: "og:description",
        content: "Everything NAGI needs you to know about calls and bookings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<string, typeof Bell> = {
  staff_followup: AlertTriangle,
  booking_created: CalendarCheck,
  booking_cancelled: CalendarX,
  booking_rescheduled: CalendarClock,
  call_finished: PhoneOff,
};

function NotificationsPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const query = useNotifications(business?.id);
  const markRead = useMarkNotificationsRead();
  useRealtime(business?.id, [{ table: "notifications", queryKey: "notifications" }]);

  if (businessQuery.isLoading)
    return (
      <AppShell title={t("notif.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  if (businessQuery.isError)
    return (
      <AppShell title={t("notif.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  if (!business) return <Navigate to="/onboarding" replace />;

  const locale = language === "ja" ? "ja-JP" : "en-US";
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: business.timezone,
    }).format(new Date(iso));
  const rows = query.data ?? [];
  const hasUnread = rows.some((n) => !n.read_at);

  return (
    <AppShell
      title={t("notif.title")}
      description={t("notif.desc")}
      actions={
        hasUnread ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markRead.mutate({ businessId: business.id })}
          >
            <CheckCheck className="size-4" />
            {t("notif.markAll")}
          </Button>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <LoadingPanel rows={4} />
      ) : query.isError ? (
        <ErrorPanel onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("notif.empty")} icon={<Bell className="size-5" />} />
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => {
            const Icon = ICONS[n.kind] ?? Bell;
            const urgent = n.kind === "staff_followup";
            const unread = !n.read_at;
            const who = [n.customer_name, n.customer_phone].filter(Boolean).join(" · ");
            return (
              <li
                key={n.id}
                className={cn(
                  "glass-panel flex gap-4 p-4",
                  urgent && unread && "border-destructive/60",
                  !unread && "opacity-70",
                )}
              >
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl bg-muted",
                    urgent && "bg-destructive/15 text-destructive",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {t("notif.kind." + n.kind)}
                    {unread && <Badge variant={urgent ? "destructive" : "secondary"}>{t("notif.unread")}</Badge>}
                    <span className="text-xs font-normal text-muted-foreground">
                      {fmt(n.created_at)}
                    </span>
                  </div>
                  {who && <p className="text-sm">{who}</p>}
                  {n.starts_at && (
                    <p className="text-sm text-muted-foreground">{fmt(n.starts_at)}</p>
                  )}
                  {n.detail && n.kind !== "booking_created" && n.kind !== "booking_cancelled" && n.kind !== "booking_rescheduled" && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.detail.replace(/^\[HANDOFF\]\s*/, "")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {n.call_id && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/calls">{t("notif.viewCall")}</Link>
                      </Button>
                    )}
                    {n.appointment_id && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/appointments">{t("notif.viewAppointments")}</Link>
                      </Button>
                    )}
                    {unread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate({ businessId: business.id, id: n.id })}
                      >
                        {t("notif.markRead")}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
