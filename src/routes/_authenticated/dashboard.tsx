import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { Bot, Clock3, Loader2, MapPin, Phone, Scissors, Sparkles, UsersRound } from "lucide-react";

import { OnlineDot } from "@/components/ai-background";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  hhmm,
  useAppointments,
  useBusiness,
  useBusinessHours,
  useRealtime,
  useServices,
  useStaff,
  type BusinessHour,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard / ダッシュボード — NAGI AI" },
      {
        name: "description",
        content: "Today's business status, hours, services, and staff at a glance.",
      },
      { property: "og:title", content: "Dashboard — NAGI AI" },
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
  const appointmentsQuery = useAppointments(businessId);
  useRealtime(businessId, [
    { table: "appointments", queryKey: "appointments" },
    { table: "customers", queryKey: "customers" },
  ]);

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
  const syncing = hoursQuery.isFetching || servicesQuery.isFetching || staffQuery.isFetching;

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
        <section className="glass-panel glow-border relative overflow-hidden p-6">
          <div
            aria-hidden
            className="animate-ai-float pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-ai-violet/15 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="glow-border grid size-10 shrink-0 place-items-center rounded-xl text-base font-semibold text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-ai)" }}
                >
                  凪
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <OnlineDot />
                  {t("dashboard.nagiOnline")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ai-indigo/25 bg-ai-indigo/10 px-2.5 py-1 text-xs text-muted-foreground">
                  {syncing ? (
                    <Loader2 className="size-3 animate-spin text-ai-indigo" />
                  ) : (
                    <Sparkles className="size-3 text-ai-indigo" />
                  )}
                  {syncing ? t("dashboard.syncing") : t("dashboard.dataConnected")}
                </span>
              </div>
              <p className="eyebrow mt-4">
                {t("dashboard.today")} · {dateLabel}
              </p>
              <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight md:text-2xl">
                {business.name}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                {t("dashboard.assistantWelcome")}
              </p>
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
            <div className="flex flex-col items-start gap-3 sm:items-end">
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
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/ai-receptionist">
                  <Bot className="size-4" />
                  {t("nav.receptionist")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="glass-panel p-5">
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
          <div className="glass-panel p-5">
            <p className="eyebrow">{t("dashboard.activeServices")}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
              <Scissors className="size-4 text-muted-foreground" />
              {activeServices.length}
              <span className="text-sm font-normal text-muted-foreground">/ {services.length}</span>
            </p>
          </div>
          <div className="glass-panel p-5">
            <p className="eyebrow">{t("dashboard.activeStaff")}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
              <UsersRound className="size-4 text-muted-foreground" />
              {activeStaff.length}
              <span className="text-sm font-normal text-muted-foreground">/ {staff.length}</span>
            </p>
          </div>
        </section>

        {setupTasks.length > 0 && (
          <section className="glass-panel p-6">
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
          <section className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{t("services.title")}</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/services">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>
            {servicesQuery.isLoading ? (
              <div className="mt-4">
                <LoadingPanel rows={2} />
              </div>
            ) : services.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title={t("services.empty")}
                  action={
                    <Button asChild size="sm">
                      <Link to="/services">{t("services.emptyCta")}</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {services.slice(0, 5).map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
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

          <section className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{t("staff.title")}</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>
            {staffQuery.isLoading ? (
              <div className="mt-4">
                <LoadingPanel rows={2} />
              </div>
            ) : staff.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title={t("staff.empty")}
                  action={
                    <Button asChild size="sm">
                      <Link to="/staff">{t("staff.emptyCta")}</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {staff.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
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
