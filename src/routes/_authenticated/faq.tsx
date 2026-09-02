import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Yoyaku AI" },
      { name: "description", content: "FAQ knowledge base for your AI receptionist. Coming in a later phase." },
      { property: "og:title", content: "FAQ — Yoyaku AI" },
      { property: "og:description", content: "FAQ knowledge base for your AI receptionist. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.faq")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.faq")} />
    </AppShell>
  );
}
