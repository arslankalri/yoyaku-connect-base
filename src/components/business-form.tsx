import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveBusiness, type Business, type SaveBusinessInput } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const TIMEZONES = [
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York",
  "UTC",
];

export function BusinessForm({
  business,
  submitLabel,
  onSaved,
  skipDefaultHours,
  businessType,
}: {
  business?: Business | null | undefined;
  submitLabel: string;
  onSaved?: ((id: string) => void) | undefined;
  skipDefaultHours?: boolean;
  businessType?: string | null | undefined;
}) {
  const { t } = useI18n();
  const save = useSaveBusiness();
  const [form, setForm] = useState({
    name: business?.name ?? "",
    phone: business?.phone ?? "",
    postal_code: business?.postal_code ?? "",
    address: business?.address ?? "",
    website: business?.website ?? "",
    timezone: business?.timezone ?? "Asia/Tokyo",
  });
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length === 0) {
      setError(t("business.errName"));
      return;
    }
    try {
      const id = await save.mutateAsync({
        ...(business?.id ? { id: business.id } : {}),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        postal_code: form.postal_code.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        timezone: form.timezone,
        ...(businessType ? { business_type: businessType } : {}),
        skipDefaultHours,
      } as SaveBusinessInput);

      toast.success(t("business.saved"));
      onSaved?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">
            {t("business.name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="name" maxLength={120} {...field("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("business.phone")}</Label>
          <Input id="phone" inputMode="tel" maxLength={30} {...field("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postal_code">{t("business.postalCode")}</Label>
          <Input id="postal_code" maxLength={12} placeholder="150-0001" {...field("postal_code")} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">{t("business.address")}</Label>
          <Input id="address" maxLength={255} {...field("address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">{t("business.website")}</Label>
          <Input id="website" maxLength={255} placeholder="https://" {...field("website")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">{t("business.timezone")}</Label>
          <Select
            value={form.timezone}
            onValueChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? t("common.saving") : submitLabel}
      </Button>
    </form>
  );
}
