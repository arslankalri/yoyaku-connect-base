import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { Clock3, MapPin, Phone, Scissors, UsersRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DemoBadge, ErrorPanel, LoadingPanel } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  hhmm,
  useBusiness,
  useBusinessHours,
  useServices,
  useStaff,
  type BusinessHour,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard / ダッシュボード — Yoyaku AI" },
      {
        name: "description",
        content: "Today's business status, hours, services, and staff at a glance.",
      },
      { property: "og:title", content: "Dashboard — Yoyaku AI" },
      {
        property: "og:description",
        content: "Today's business status, hours, services, and staff at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function statusFor(hour: BusinessHour | undefined, now: Date) {
  if (!hour) return "unset" as const;
  if (!hour.is_open) return "holiday" as const;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = hhmm(hour.open_time).split(":").map(Number);
  const [ch, cm] = hhmm(hour.close_time).split(":").map(Number);
  const open = (oh ?? 0) * 60 + (om ?? 0);
  const close = (ch ?? 0) * 60 + (cm ?? 0);
  return minutes >= open && minutes < close ? ("open" as const) : ("closed" as const);
}

function Dashboard() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const businessId = businessQuery.data?.id;
  const hoursQuery = useBusinessHours(businessId);
  const servicesQuery = useServices(businessId);
  const staffQuery = useStaff(businessId);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("dashboard.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("dashboard.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!businessQuery.data) return <Navigate to="/onboarding" replace />;

  const business = businessQuery.data;
  const now = new Date();
  const today = hoursQuery.data?.find((h) => h.day_of_week === now.getDay());
  const status = statusFor(today, now);
  const services = servicesQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const activeServices = services.filter((s) => s.is_active);
  const activeStaff = staff.filter((s) => s.is_active);

  const dateLabel = new Intl.DateTimeFormat(language === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);

  const statusLabel = {
    open: t("dashboard.statusOpen"),
    closed: t("dashboard.statusClosed"),
    holiday: t("dashboard.statusHoliday"),
    unset: t("dashboard.statusUnset"),
  }[status];

  const setupTasks = [
    ...(hoursQuery.data && hoursQuery.data.length > 0
      ? []
      : [{ to: "/settings", label: t("dashboard.setupHours") }]),
    ...(services.length > 0 ? [] : [{ to: "/services", label: t("dashboard.setupServices") }]),
    ...(staff.length > 0 ? [] : [{ to: "/staff", label: t("dashboard.setupStaff") }]),
  ] as const;

  return (
    <AppShell title={t("dashboard.title")} description={t("dashboard.welcome")}>
      <div className="space-y-6">
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">{t("dashboard.today")} · {dateLabel}</p>
              <h2 className="mt-2 truncate text-xl font-semibold tracking-tight">{business.name}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {business.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {business.phone}
                  </span>
                )}
                {business.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {business.postal_code ? `〒${business.postal_code} ` : ""}
                    {business.address}
                  </span>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                status === "open"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-secondary text-muted-foreground"
              }
            >
              {statusLabel}
            </Badge>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-5">
            <p className="eyebrow">{t("dashboard.todayHours")}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
              <Clock3 className="size-4 text-muted-foreground" />
              {today && today.is_open
                ? `${hhmm(today.open_time)} – ${hhmm(today.close_time)}`
                : status === "holiday"
                  ? t("hours.closed")
                  : "—"}
            </p>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">{t("dashboard.activeServices")}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
              <Scissors className="size-4 text-muted-foreground" />
              {activeServices.length}
              <span className="text-sm font-normal text-muted-foreground">/ {services.length}</span>
            </p>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">{t("dashboard.activeStaff")}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
              <UsersRound className="size-4 text-muted-foreground" />
              {activeStaff.length}
              <span className="text-sm font-normal text-muted-foreground">/ {staff.length}</span>
            </p>
          </div>
        </section>

        {setupTasks.length > 0 && (
          <section className="panel p-6">
            <h3 className="text-base font-semibold">{t("dashboard.setupTitle")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {setupTasks.map((task) => (
                <Button key={task.to} asChild variant="outline" size="sm">
                  <Link to={task.to}>{task.label}</Link>
                </Button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{t("services.title")}</h3>
              {services.length === 0 ? (
                <DemoBadge />
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/services">{t("dashboard.viewAll")}</Link>
                </Button>
              )}
            </div>
            {servicesQuery.isLoading ? (
              <div className="mt-4">
                <LoadingPanel rows={2} />
              </div>
            ) : services.length === 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.demoNotice")}</p>
                <ul className="space-y-2 opacity-70">
                  {[
                    { name: "カット / Haircut", meta: "60 " + t("common.minutes") + " · ¥5,500" },
                    { name: "カラー / Color", meta: "90 " + t("common.minutes") + " · ¥9,900" },
                  ].map((demo) => (
                    <li
                      key={demo.name}
                      className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-sm"
                    >
                      <span>{demo.name}</span>
                      <span className="text-muted-foreground">{demo.meta}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm">
                  <Link to="/services">{t("services.emptyCta")}</Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {services.slice(0, 5).map((service) => (
                  <li key={service.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate">{service.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {service.duration_minutes} {t("common.minutes")} · ¥
                      {Number(service.price).toLocaleString("ja-JP")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{t("staff.title")}</h3>
              {staff.length === 0 ? (
                <DemoBadge />
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/staff">{t("dashboard.viewAll")}</Link>
                </Button>
              )}
            </div>
            {staffQuery.isLoading ? (
              <div className="mt-4">
                <LoadingPanel rows={2} />
              </div>
            ) : staff.length === 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.demoNotice")}</p>
                <ul className="space-y-2 opacity-70">
                  {["佐藤 / Sato", "田中 / Tanaka"].map((demo) => (
                    <li
                      key={demo}
                      className="rounded-lg border border-dashed border-border px-3 py-2 text-sm"
                    >
                      {demo}
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm">
                  <Link to="/staff">{t("staff.emptyCta")}</Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {staff.slice(0, 5).map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate">{member.name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {member.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
