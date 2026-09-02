import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/ai-receptionist")({
  head: () => ({
    meta: [
      { title: "AI Receptionist / AI受付 — Yoyaku AI" },
      { name: "description", content: "Configure your AI receptionist. Coming in a later phase." },
      { property: "og:title", content: "AI Receptionist / AI受付 — Yoyaku AI" },
      { property: "og:description", content: "Configure your AI receptionist. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.receptionist")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.receptionist")} />
    </AppShell>
  );
}
