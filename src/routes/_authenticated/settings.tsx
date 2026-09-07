import { Navigate, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { BusinessForm } from "@/components/business-form";
import { BusinessHoursForm } from "@/components/business-hours-form";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings / 設定 — NAGI AI" },
      {
        name: "description",
        content: "Update your business profile, opening hours, and language.",
      },
      { property: "og:title", content: "Settings — NAGI AI" },
      {
        property: "og:description",
        content: "Business profile, opening hours, and interface language.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const businessQuery = useBusiness();

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("settings.title")}>
        <LoadingPanel />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("settings.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!businessQuery.data) return <Navigate to="/onboarding" replace />;

  return (
    <AppShell title={t("settings.title")} description={t("settings.desc")}>
      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business">{t("settings.tabBusiness")}</TabsTrigger>
          <TabsTrigger value="hours">{t("settings.tabHours")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("settings.tabCalendar")}</TabsTrigger>
          <TabsTrigger value="account">{t("settings.tabAccount")}</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="glass-panel max-w-2xl p-6">
            <BusinessForm business={businessQuery.data} submitLabel={t("common.save")} />
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <BusinessHoursForm businessId={businessQuery.data.id} />
        </TabsContent>

        <TabsContent value="calendar">
          <div className="max-w-2xl">
            <GoogleCalendarPanel businessId={businessQuery.data.id} />
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="glass-panel max-w-2xl space-y-4 p-6">
            <div>
              <h2 className="text-base font-semibold">{t("settings.language")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
              <div className="mt-3">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
