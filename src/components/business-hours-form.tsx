import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DAYS, hhmm, useBusinessHours, useSaveBusinessHours, type BusinessHour } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HoursRow = { day_of_week: number; is_open: boolean; open_time: string; close_time: string };

function defaultRows(existing: BusinessHour[], fallback?: HoursRow[]): HoursRow[] {
  const base =
    fallback ??
    DAYS.map((day) => ({
      day_of_week: day,
      is_open: day !== 0,
      open_time: "09:00",
      close_time: "18:00",
    }));
  return base.map((row) => {
    const match = existing.find((h) => h.day_of_week === row.day_of_week);
    if (!match) return row;
    return {
      day_of_week: row.day_of_week,
      is_open: match.is_open,
      open_time: hhmm(match.open_time) || row.open_time,
      close_time: hhmm(match.close_time) || row.close_time,
    };
  });
}

export function BusinessHoursForm({
  businessId,
  preset,
  submitLabel,
  onSaved,
}: {
  businessId: string;
  preset?: HoursRow[];
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const hoursQuery = useBusinessHours(businessId);
  const saveHours = useSaveBusinessHours(businessId);
  const [rows, setRows] = useState<HoursRow[]>(defaultRows([], preset));

  useEffect(() => {
    if (hoursQuery.data) setRows(defaultRows(hoursQuery.data, preset));
  }, [hoursQuery.data, preset]);

  if (hoursQuery.isLoading) {
    return (
      <div className="space-y-4">
        {DAYS.map((d) => (
          <div key={d} className="h-10 rounded-md bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  function update(day: number, patch: Partial<HoursRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    try {
      await saveHours.mutateAsync(rows);
      toast.success(t("hours.saved"));
      onSaved?.();
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className={cn("space-y-5", !submitLabel && "glass-panel p-6")}>
      {!submitLabel && (
        <div>
          <h2 className="text-base font-semibold">{t("hours.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("hours.desc")}</p>
        </div>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <li
            key={row.day_of_week}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 px-3 py-3.5 sm:flex-nowrap"
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

      <Button onClick={onSave} disabled={saveHours.isPending}>
        {saveHours.isPending ? t("common.saving") : (submitLabel ?? t("common.save"))}
      </Button>
    </div>
  );
}
