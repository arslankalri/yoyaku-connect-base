import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments / 予約 — NAGI AI" },
      { name: "description", content: "Appointment management. Coming in a later phase." },
      { property: "og:title", content: "Appointments / 予約 — NAGI AI" },
      { property: "og:description", content: "Appointment management. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.appointments")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.appointments")} />
    </AppShell>
  );
}
