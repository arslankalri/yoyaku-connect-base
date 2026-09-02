import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics / 分析 — NAGI AI" },
      { name: "description", content: "Business analytics. Coming in a later phase." },
      { property: "og:title", content: "Analytics / 分析 — NAGI AI" },
      { property: "og:description", content: "Business analytics. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.analytics")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.analytics")} />
    </AppShell>
  );
}
