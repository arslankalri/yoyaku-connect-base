import { Navigate, createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppointments, useBusiness, useBusinessHours, useRealtime, hhmm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar / カレンダー — NAGI AI" },
      { name: "description", content: "Live weekly calendar view of your appointments." },
      { property: "og:title", content: "Calendar / カレンダー — NAGI AI" },
      { property: "og:description", content: "See your week of bookings update in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function CalendarPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const businessId = business?.id;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 86_400_000), [weekStart]);
  const appointmentsQuery = useAppointments(
    businessId,
    businessId ? { from: weekStart.toISOString(), to: weekEnd.toISOString() } : undefined,
  );
  const hoursQuery = useBusinessHours(businessId);
  useRealtime(businessId, [{ table: "appointments", queryKey: "appointments" }]);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("cal.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("cal.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!business) return <Navigate to="/onboarding" replace />;

  const locale = language === "ja" ? "ja-JP" : "en-US";
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000));
  const appointments = (appointmentsQuery.data ?? []).filter((a) => a.status !== "cancelled");
  const todayKey = new Date().toDateString();

  return (
    <AppShell
      title={t("cal.title")}
      description={t("cal.desc")}
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("cal.prev")}
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86_400_000))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t("cal.today")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("cal.next")}
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86_400_000))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      {appointmentsQuery.isLoading ? (
        <LoadingPanel rows={4} />
      ) : appointmentsQuery.isError ? (
        <ErrorPanel onRetry={() => appointmentsQuery.refetch()} />
      ) : (
        <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          {days.map((day) => {
            const hours = hoursQuery.data?.find((h) => h.day_of_week === day.getDay());
            const dayItems = appointments
              .filter((a) => new Date(a.starts_at).toDateString() === day.toDateString())
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            return (
              <section
                key={day.toISOString()}
                className={cn(
                  "min-w-0 space-y-4 border-t border-border py-4",
                  day.toDateString() === todayKey && "border-primary border-t-2",
                )}
              >
                <header className="space-y-1">
                  <p className={cn("text-sm font-semibold", day.toDateString() === todayKey && "text-primary")}>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }).format(day)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {hours?.is_open
                      ? `${hhmm(hours.open_time)} – ${hhmm(hours.close_time)}`
                      : t("cal.closed")}
                  </p>
                </header>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("cal.noAppointments")}</p>
                ) : (
                  <ul className="space-y-2">
                    {dayItems.map((appointment) => (
                      <li
                        key={appointment.id}
                        className="min-w-0 rounded-md border-l-2 border-primary/40 bg-surface px-3 py-3 text-xs leading-relaxed"
                      >
                        <p className="font-medium">
                          {new Intl.DateTimeFormat(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(appointment.starts_at))}{" "}
                          {appointment.services?.name ?? t("appt.noService")}
                        </p>
                        <p className="text-muted-foreground">
                          {appointment.customers?.name ?? "—"}
                          {appointment.staff?.name ? ` · ${appointment.staff.name}` : ""}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {t(`appt.status.${appointment.status}`)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
