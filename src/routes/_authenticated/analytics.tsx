import { Navigate, createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import {
  useAppointments,
  useBusiness,
  useConversations,
  useCustomers,
  useRealtime,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics / 分析 — NAGI AI" },
      {
        name: "description",
        content: "Booking volume, cancellations, revenue outlook, and NAGI performance.",
      },
      { property: "og:title", content: "Analytics / 分析 — NAGI AI" },
      { property: "og:description", content: "Live figures calculated from your own bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const DAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AnalyticsPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const businessId = business?.id;
  const appointmentsQuery = useAppointments(businessId);
  const customersQuery = useCustomers(businessId);
  const conversationsQuery = useConversations(businessId);
  useRealtime(businessId, [
    { table: "appointments", queryKey: "appointments" },
    { table: "customers", queryKey: "customers" },
    { table: "calls", queryKey: "conversations" },
  ]);

  const metrics = useMemo(() => {
    const all = appointmentsQuery.data ?? [];
    const now = Date.now();
    const from = now - 30 * 86_400_000;
    const last30 = all.filter((a) => new Date(a.starts_at).getTime() >= from);
    const cancelled = last30.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length;
    const upcoming = all.filter(
      (a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled",
    ).length;
    const byNagi = last30.filter((a) => a.source.startsWith("nagi")).length;
    const revenue = last30
      .filter((a) => a.status === "confirmed" || a.status === "completed")
      .reduce((sum, a) => sum + Number(a.services?.price ?? 0), 0);

    const serviceCounts = new Map<string, number>();
    const weekdayCounts = new Array(7).fill(0) as number[];
    for (const appointment of last30) {
      const name = appointment.services?.name ?? t("appt.noService");
      serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
      weekdayCounts[new Date(appointment.starts_at).getDay()] += 1;
    }

    return {
      total30: last30.length,
      cancelRate: last30.length > 0 ? Math.round((cancelled / last30.length) * 100) : 0,
      upcoming,
      byNagi,
      revenue,
      topServices: [...serviceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      weekdayCounts,
    };
  }, [appointmentsQuery.data, t]);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("an.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("an.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!business) return <Navigate to="/onboarding" replace />;

  const labels = language === "ja" ? DAY_LABELS_JA : DAY_LABELS_EN;
  const maxWeekday = Math.max(1, ...metrics.weekdayCounts);
  const noData =
    (appointmentsQuery.data ?? []).length === 0 && (conversationsQuery.data ?? []).length === 0;

  return (
    <AppShell title={t("an.title")} description={t("an.desc")}>
      {appointmentsQuery.isLoading ? (
        <LoadingPanel rows={4} />
      ) : appointmentsQuery.isError ? (
        <ErrorPanel onRetry={() => appointmentsQuery.refetch()} />
      ) : noData ? (
        <EmptyState title={t("an.empty")} icon={<BarChart3 className="size-5" />} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label={t("an.appointments30")} value={String(metrics.total30)} />
            <Metric label={t("an.upcoming")} value={String(metrics.upcoming)} />
            <Metric label={t("an.cancelRate")} value={`${metrics.cancelRate}%`} />
            <Metric label={t("an.byNagi")} value={String(metrics.byNagi)} />
            <Metric
              label={t("an.revenue30")}
              value={`¥${metrics.revenue.toLocaleString("ja-JP")}`}
            />
            <Metric label={t("an.customers")} value={String((customersQuery.data ?? []).length)} />
            <Metric
              label={t("an.conversations")}
              value={String((conversationsQuery.data ?? []).length)}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass-panel p-6">
              <h2 className="text-base font-semibold">{t("an.topServices")}</h2>
              {metrics.topServices.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t("an.empty")}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {metrics.topServices.map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-panel p-6">
              <h2 className="text-base font-semibold">{t("an.byWeekday")}</h2>
              <ul className="mt-4 space-y-2">
                {metrics.weekdayCounts.map((count, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <span className="w-8 shrink-0 text-muted-foreground">{labels[index]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(count / maxWeekday) * 100}%`,
                          backgroundImage: "var(--gradient-ai)",
                        }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
