import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { BusinessForm } from "@/components/business-form";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { useBusiness } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Business setup / 店舗情報の登録 — Yoyaku AI" },
      { name: "description", content: "Add your business details to get started with Yoyaku AI." },
      { property: "og:title", content: "Business setup — Yoyaku AI" },
      { property: "og:description", content: "Add your business details to start using Yoyaku AI." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: business, isLoading, isError, refetch } = useBusiness();

  return (
    <AppShell title={t("onboarding.title")} description={t("onboarding.desc")}>
      {isLoading ? (
        <LoadingPanel />
      ) : isError ? (
        <ErrorPanel onRetry={() => refetch()} />
      ) : (
        <div className="panel max-w-2xl p-6">
          <BusinessForm
            business={business}
            submitLabel={t("onboarding.submit")}
            onSaved={() => navigate({ to: "/dashboard" })}
          />
        </div>
      )}
    </AppShell>
  );
}
