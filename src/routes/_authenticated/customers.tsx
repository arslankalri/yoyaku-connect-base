import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/states";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers / 顧客 — Yoyaku AI" },
      { name: "description", content: "Customer records. Coming in a later phase." },
      { property: "og:title", content: "Customers / 顧客 — Yoyaku AI" },
      { property: "og:description", content: "Customer records. Coming in a later phase." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <AppShell title={t("nav.customers")} description={t("common.comingSoonDesc")}>
      <ComingSoon title={t("nav.customers")} />
    </AppShell>
  );
}
