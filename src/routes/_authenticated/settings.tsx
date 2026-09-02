import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { BusinessForm } from "@/components/business-form";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DAYS,
  hhmm,
  useBusiness,
  useBusinessHours,
  useSaveBusinessHours,
  type BusinessHour,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings / 設定 — NAGI AI" },
      { name: "description", content: "Update your business profile, opening hours, and language." },
      { property: "og:title", content: "Settings — NAGI AI" },
      { property: "og:description", content: "Business profile, opening hours, and interface language." },
    ],
  }),
  component: SettingsPage,
});

type HoursRow = { day_of_week: number; is_open: boolean; open_time: string; close_time: string };

function defaultRows(existing: BusinessHour[]): HoursRow[] {
  return DAYS.map((day) => {
    const match = existing.find((h) => h.day_of_week === day);
    return {
      day_of_week: day,
      is_open: match ? match.is_open : day !== 0,
      open_time: hhmm(match?.open_time) || "09:00",
      close_time: hhmm(match?.close_time) || "18:00",
    };
  });
}

function BusinessHoursForm({ businessId }: { businessId: string }) {
  const { t } = useI18n();
  const hoursQuery = useBusinessHours(businessId);
  const saveHours = useSaveBusinessHours(businessId);
  const [rows, setRows] = useState<HoursRow[]>(defaultRows([]));

  useEffect(() => {
    if (hoursQuery.data) setRows(defaultRows(hoursQuery.data));
  }, [hoursQuery.data]);

  if (hoursQuery.isLoading) return <LoadingPanel rows={4} />;
  if (hoursQuery.isError) return <ErrorPanel onRetry={() => hoursQuery.refetch()} />;

  function update(day: number, patch: Partial<HoursRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    try {
      await saveHours.mutateAsync(rows);
      toast.success(t("hours.saved"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="glass-panel p-6">
      <h2 className="text-base font-semibold">{t("hours.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("hours.desc")}</p>

      <ul className="mt-5 divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.day_of_week}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5 sm:flex-nowrap"
          >
            <span className="w-24 shrink-0 text-sm font-medium">{t(`day.${row.day_of_week}`)}</span>
            <div className="flex w-32 shrink-0 items-center gap-2">
              <Switch
                id={`open-${row.day_of_week}`}
                checked={row.is_open}
                onCheckedChange={(checked) => update(row.day_of_week, { is_open: checked })}
              />
              <Label htmlFor={`open-${row.day_of_week}`} className="text-sm text-muted-foreground">
                {row.is_open ? t("hours.open") : t("hours.closed")}
              </Label>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <Input
                type="time"
                aria-label={t("hours.openTime")}
                value={row.open_time}
                disabled={!row.is_open}
                onChange={(e) => update(row.day_of_week, { open_time: e.target.value })}
                className="w-32"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                aria-label={t("hours.closeTime")}
                value={row.close_time}
                disabled={!row.is_open}
                onChange={(e) => update(row.day_of_week, { close_time: e.target.value })}
                className="w-32"
              />
            </div>
          </li>
        ))}
      </ul>

      <Button className="mt-5" onClick={onSave} disabled={saveHours.isPending}>
        {saveHours.isPending ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  );
}

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
