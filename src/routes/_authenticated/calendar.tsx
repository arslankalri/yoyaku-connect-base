import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar / カレンダー — Yoyaku AI" },
      { name: "description", content: "Calendar view of your bookings. Coming in a later phase." },
      { property: "og:title", content: "Calendar / カレンダー — Yoyaku AI" },
      { property: "og:description", content: "Calendar view of your bookings. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.calendar")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.calendar")} />
    </AppShell>
  );
}
