import { Navigate, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { FaqManager } from "@/components/faq-manager";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { useBusiness } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "FAQ knowledge base — NAGI AI" },
      {
        name: "description",
        content:
          "Manage the questions and answers NAGI uses when replying to your customers, in Japanese or English.",
      },
      { property: "og:title", content: "FAQ knowledge base — NAGI AI" },
      {
        property: "og:description",
        content: "Questions and answers NAGI quotes exactly when replying to customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const businessQuery = useBusiness();

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("nav.faq")}>
        <LoadingPanel />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("nav.faq")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!businessQuery.data) return <Navigate to="/onboarding" replace />;

  return (
    <AppShell title={t("nav.faq")} description={t("faq.desc")}>
      <FaqManager businessId={businessQuery.data.id} />
    </AppShell>
  );
}
