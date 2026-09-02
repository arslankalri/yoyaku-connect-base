import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({
    meta: [
      { title: "Call History / 通話履歴 — Yoyaku AI" },
      { name: "description", content: "Call history and transcripts. Coming in a later phase." },
      { property: "og:title", content: "Call History / 通話履歴 — Yoyaku AI" },
      { property: "og:description", content: "Call history and transcripts. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.calls")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.calls")} />
    </AppShell>
  );
}
