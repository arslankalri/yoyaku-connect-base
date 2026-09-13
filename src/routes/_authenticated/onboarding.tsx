import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BusinessForm } from "@/components/business-form";
import { BusinessHoursForm } from "@/components/business-hours-form";
import { ErrorPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  useBusiness,
  useBusinessHours,
  useServices,
  useSetupProgress,
  useStaff,
  useUpdateBusinessType,
  type Business,
} from "@/lib/api";
import {
  BUSINESS_TYPES,
  isSeatingBusiness,
  presetHours,
  presetServices,
  useBusinessTypeLabel,
  type BusinessType,
} from "@/lib/business-presets";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const STEPS = ["type", "profile", "hours", "services", "staff", "done"] as const;

type Step = (typeof STEPS)[number];

type ServiceRow = { id?: string; name: string; duration_minutes: number; price: number };
type StaffRow = { id?: string; name: string };

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Setup / 初期設定 — NAGI AI" },
      {
        name: "description",
        content: "Set up your business so NAGI AI can start answering customers.",
      },
      { property: "og:title", content: "Setup / 初期設定 — NAGI AI" },
      {
        property: "og:description",
        content: "Business details, opening hours, services, and staff in five steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const progress = useSetupProgress(business?.id);
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<BusinessType | null>(
    (business?.business_type as BusinessType) ?? null,
  );
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (business?.business_type) setSelectedType(business.business_type as BusinessType);
  }, [business?.business_type]);

  // Resolve the resume step once the saved data is known, so refreshing the
  // browser continues where the owner left off instead of restarting.
  useEffect(() => {
    if (stepIndex !== null || progress.isLoading) return;
    setStepIndex(resumeStep(progress));
  }, [stepIndex, progress]);

  if ((businessQuery.isLoading && !business) || stepIndex === null) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="h-8 w-1/2 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-2 w-full rounded-md bg-muted/60 animate-pulse" />
          <div className="glass-panel h-96 animate-pulse" />
        </div>
      </div>
    );
  }
  if (businessQuery.isError) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </div>
    );
  }

  const step: Step = STEPS[stepIndex]!;
  const stepCount = STEPS.length - 1;
  const completed = stepIndex;
  const effectiveType: BusinessType = selectedType ?? "other";

  function goNext() {
    setStepIndex((i) => Math.min((i ?? 0) + 1, STEPS.length - 1));
  }
  function goTo(idx: number) {
    if (idx <= completed + 1) setStepIndex(idx);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("setup.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("setup.subtitle")}</p>
        </div>

        <div className="mb-8">
          <Progress value={(completed / stepCount) * 100} className="h-2" />
          <div className="mt-3 flex justify-between">
            {STEPS.slice(0, -1).map((key, idx) => (
              <button
                key={key}
                type="button"
                onClick={() => goTo(idx)}
                disabled={idx > completed + 1}
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  idx <= completed ? "text-ai-indigo" : "text-muted-foreground",
                  idx > completed + 1 && "cursor-not-allowed opacity-50",
                )}
              >
                {t(`setup.step.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel glow-border p-5 sm:p-8">
          {step === "type" && (
            <TypeStep
              selected={selectedType}
              businessId={business?.id}
              onSelect={setSelectedType}
              onSaved={goNext}
            />
          )}
          {step === "profile" && (
            <ProfileStep business={business} businessType={selectedType} onSaved={goNext} />
          )}
          {step === "hours" && business && (
            <HoursStep businessId={business.id} type={effectiveType} onSaved={goNext} />
          )}
          {step === "services" && business && (
            <ServicesStep businessId={business.id} type={effectiveType} onSaved={goNext} />
          )}
          {step === "staff" && business && <StaffStep businessId={business.id} onSaved={goNext} />}

          {step === "done" && (
            <DoneStep
              businessId={business?.id}
              onDashboard={() => void navigate({ to: "/dashboard", replace: true })}
              onTryNagi={() => void navigate({ to: "/ai-receptionist", replace: true })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function resumeStep(progress: ReturnType<typeof useSetupProgress>) {
  if (!progress.hasBusinessType) return 0;
  if (!progress.hasBusiness) return 1;
  if (!progress.hasHours) return 2;
  if (!progress.hasServices) return 3;
  if (!progress.hasStaff) return 4;
  return 5;
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function SkipRow({ onSkip, label }: { onSkip: () => void; label: string }) {
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={onSkip}>
        {label}
      </Button>
    </div>
  );
}

function ProfileStep({
  business,
  businessType,
  onSaved,
}: {
  business?: Business | null | undefined;
  businessType: BusinessType | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const typeLabel = useBusinessTypeLabel(businessType ?? undefined);
  return (
    <div className="space-y-4">
      <StepHeader
        title={t("setup.profile.title")}
        desc={typeLabel ? `${typeLabel} — ${t("setup.profile.desc")}` : t("setup.profile.desc")}
      />
      <BusinessForm
        business={business ?? null}
        submitLabel={t("setup.next")}
        skipDefaultHours
        businessType={businessType}
        onSaved={() => onSaved()}
      />
    </div>
  );
}

function TypeStep({
  selected,
  businessId,
  onSelect,
  onSaved,
}: {
  selected: BusinessType | null;
  businessId?: string | undefined;
  onSelect: (type: BusinessType) => void;
  onSaved: () => void;
}) {
  const { t, language } = useI18n();
  const updateType = useUpdateBusinessType();

  async function save() {
    if (!selected) return;
    // Before the business record exists the choice is carried into the next
    // step and stored together with the profile.
    if (!businessId) {
      onSaved();
      return;
    }
    try {
      await updateType.mutateAsync({ id: businessId, type: selected });
      onSaved();
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title={t("setup.type.title")} desc={t("setup.type.desc")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BUSINESS_TYPES.map((option) => (
          <Card
            key={option.key}
            role="button"
            aria-pressed={selected === option.key}
            onClick={() => onSelect(option.key)}
            className={cn(
              "cursor-pointer p-4 transition-colors hover:bg-accent",
              selected === option.key && "border-ai-indigo bg-ai-indigo/10 ring-1 ring-ai-indigo",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{option.icon}</span>
              <div>
                <p className="font-medium">{option.label[language]}</p>
                <p className="text-xs text-muted-foreground">
                  {option.key === "other" ? "" : t("setup.type.presetHint")}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={!selected || updateType.isPending} className="ml-auto">
          {updateType.isPending ? t("common.saving") : t("setup.next")}
        </Button>
      </div>
      <SkipRow onSkip={onSaved} label={t("setup.skip")} />
    </div>
  );
}

function HoursStep({
  businessId,
  type,
  onSaved,
}: {
  businessId: string;
  type: BusinessType;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const existing = useBusinessHours(businessId);
  const hasSaved = (existing.data ?? []).length > 0;

  return (
    <div className="space-y-4">
      <StepHeader title={t("setup.hours.title")} desc={t("setup.hours.desc")} />
      <BusinessHoursForm
        businessId={businessId}
        {...(hasSaved ? {} : { preset: presetHours(type).map((h) => ({ ...h })) })}
        submitLabel={t("setup.next")}
        onSaved={onSaved}
      />
      <SkipRow onSkip={onSaved} label={t("setup.skip")} />
    </div>
  );
}

function ServicesStep({
  businessId,
  type,
  onSaved,
}: {
  businessId: string;
  type: BusinessType;
  onSaved: () => void;
}) {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const existing = useServices(businessId);
  const [rows, setRows] = useState<ServiceRow[] | null>(null);

  // Start from what is already stored so returning to this step edits the real
  // services instead of inserting duplicates.
  useEffect(() => {
    if (rows !== null || existing.isLoading) return;
    const saved = existing.data ?? [];
    setRows(
      saved.length > 0
        ? saved.map((s) => ({
            id: s.id,
            name: s.name,
            duration_minutes: s.duration_minutes,
            price: Number(s.price),
          }))
        : presetServices(type).map((s) => ({
            name: s.name[language],
            duration_minutes: s.duration_minutes,
            price: s.price,
          })),
    );
  }, [rows, existing.isLoading, existing.data, type, language]);

  const save = useMutation({
    mutationFn: async () => {
      const current = (rows ?? []).filter((r) => r.name.trim().length > 0);
      const savedIds = (existing.data ?? []).map((s) => s.id);
      const keptIds = current.map((r) => r.id).filter(Boolean) as string[];
      const removed = savedIds.filter((id) => !keptIds.includes(id));

      for (const row of current) {
        const payload = {
          business_id: businessId,
          name: row.name.trim(),
          price: row.price,
          duration_minutes: row.duration_minutes,
          is_active: true,
        };
        const { error } = row.id
          ? await supabase.from("services").update(payload).eq("id", row.id)
          : await supabase.from("services").insert(payload);
        if (error) throw error;
      }
      if (removed.length > 0) {
        const { error } = await supabase.from("services").delete().in("id", removed);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", businessId] });
      toast.success(t("services.saved"));
      onSaved();
    },
    onError: () => toast.error(t("common.error")),
  });

  function update(idx: number, patch: Partial<ServiceRow>) {
    setRows((prev) => (prev ?? []).map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const list = rows ?? [];

  return (
    <div className="space-y-4">
      <StepHeader
        title={
          isSeatingBusiness(type) ? t("setup.services.titleSeating") : t("setup.services.title")
        }
        desc={isSeatingBusiness(type) ? t("setup.services.descSeating") : t("setup.services.desc")}
      />

      <ul className="space-y-3">
        {list.map((row, idx) => (
          <li
            key={row.id ?? `new-${idx}`}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
          >
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs text-muted-foreground">{t("services.name")}</Label>
              <Input value={row.name} onChange={(e) => update(idx, { name: e.target.value })} />
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground">{t("services.duration")}</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={row.duration_minutes}
                onChange={(e) => update(idx, { duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground">{t("services.price")}</Label>
              <Input
                type="number"
                min={0}
                value={row.price}
                onChange={(e) => update(idx, { price: Number(e.target.value) })}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows((prev) => (prev ?? []).filter((_, i) => i !== idx))}
              className="text-destructive"
            >
              {t("common.remove")}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => [...(prev ?? []), { name: "", duration_minutes: 60, price: 0 }])
          }
        >
          {t("services.add")}
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={list.every((r) => !r.name.trim()) || save.isPending}
          className="ml-auto"
        >
          {save.isPending ? t("common.saving") : t("setup.next")}
        </Button>
      </div>
      <SkipRow onSkip={onSaved} label={t("setup.skip")} />
    </div>
  );
}

function StaffStep({ businessId, onSaved }: { businessId: string; onSaved: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const existing = useStaff(businessId);
  const [rows, setRows] = useState<StaffRow[] | null>(null);

  useEffect(() => {
    if (rows !== null || existing.isLoading) return;
    const saved = existing.data ?? [];
    setRows(saved.length > 0 ? saved.map((s) => ({ id: s.id, name: s.name })) : [{ name: "" }]);
  }, [rows, existing.isLoading, existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const current = (rows ?? []).filter((r) => r.name.trim().length > 0);
      const savedIds = (existing.data ?? []).map((s) => s.id);
      const keptIds = current.map((r) => r.id).filter(Boolean) as string[];
      const removed = savedIds.filter((id) => !keptIds.includes(id));

      for (const row of current) {
        const payload = { business_id: businessId, name: row.name.trim(), is_active: true };
        const { error } = row.id
          ? await supabase.from("staff").update(payload).eq("id", row.id)
          : await supabase.from("staff").insert(payload);
        if (error) throw error;
      }
      if (removed.length > 0) {
        const { error } = await supabase.from("staff").delete().in("id", removed);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff", businessId] });
      toast.success(t("staff.saved"));
      onSaved();
    },
    onError: () => toast.error(t("common.error")),
  });

  const list = rows ?? [];

  return (
    <div className="space-y-4">
      <StepHeader title={t("setup.staff.title")} desc={t("setup.staff.desc")} />
      <ul className="space-y-3">
        {list.map((row, idx) => (
          <li key={row.id ?? `new-${idx}`} className="flex items-center gap-2">
            <Input
              value={row.name}
              placeholder={t("staff.name")}
              onChange={(e) =>
                setRows((prev) =>
                  (prev ?? []).map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                )
              }
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows((prev) => (prev ?? []).filter((_, i) => i !== idx))}
              disabled={list.length === 1}
              className="text-destructive"
            >
              {t("common.remove")}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...(prev ?? []), { name: "" }])}
        >
          {t("staff.add")}
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={list.every((r) => !r.name.trim()) || save.isPending}
          className="ml-auto"
        >
          {save.isPending ? t("common.saving") : t("setup.next")}
        </Button>
      </div>
      <SkipRow onSkip={onSaved} label={t("setup.skip")} />
    </div>
  );
}

function DoneStep({
  businessId,
  onDashboard,
  onTryNagi,
}: {
  businessId?: string | undefined;
  onDashboard: () => void;
  onTryNagi: () => void;
}) {
  const { t } = useI18n();
  const services = useServices(businessId);
  const staff = useStaff(businessId);
  const hours = useBusinessHours(businessId);

  const summary = t("setup.done.summary")
    .replace("{s}", String((services.data ?? []).filter((s) => s.is_active).length))
    .replace("{p}", String((staff.data ?? []).filter((s) => s.is_active).length))
    .replace("{d}", String((hours.data ?? []).filter((h) => h.is_open).length));

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
        <span className="text-2xl">✓</span>
      </div>
      <h2 className="text-xl font-semibold">{t("setup.done.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("setup.done.desc")}</p>
      <p className="text-sm font-medium">{summary}</p>
      <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
        <Button onClick={onTryNagi}>{t("setup.done.tryNagi")}</Button>
        <Button variant="outline" onClick={onDashboard}>
          {t("setup.done.cta")}
        </Button>
      </div>
    </div>
  );
}
