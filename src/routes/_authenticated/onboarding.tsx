import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BusinessForm } from "@/components/business-form";
import { BusinessHoursForm } from "@/components/business-hours-form";
import { ErrorPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useBusiness, useSetupProgress, useUpdateBusinessType } from "@/lib/api";
import {
  BUSINESS_TYPES,
  presetHours,
  presetServices,
  type BusinessType,
  type PresetService,
} from "@/lib/business-presets";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

const STEPS = ["profile", "type", "hours", "services", "staff", "done"] as const;

type Step = (typeof STEPS)[number];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Setup / 初期設定 — NAGI AI" },
      {
        name: "description",
        content: "Set up your business so NAGI AI can start answering customers.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const progress = useSetupProgress(businessQuery.data?.id);
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | undefined>(businessQuery.data?.id);
  const [selectedType, setSelectedType] = useState<BusinessType | null>(
    (businessQuery.data?.business_type as BusinessType) ?? null,
  );
  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(progress));

  useEffect(() => {
    if (businessQuery.data?.id) setBusinessId(businessQuery.data.id);
  }, [businessQuery.data?.id]);

  if (businessQuery.isLoading && !businessQuery.data) {
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

  const business = businessQuery.data;
  const step = STEPS[stepIndex];
  const stepCount = STEPS.length - 1;
  const completed = stepIndex;

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goTo(idx: number) {
    if (idx <= completed + 1) setStepIndex(idx);
  }
  function finish() {
    void navigate({ to: "/dashboard", replace: true });
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
          {step === "profile" && (
            <ProfileStep
              onSaved={(id) => {
                setStepIndex((i) => Math.max(i, 1));
              }}
            />
          )}
          {step === "type" && business && (
            <TypeStep
              selected={selectedType}
              businessId={business.id}
              onSelect={(type) => setSelectedType(type)}
              onSaved={goNext}
            />
          )}
          {step === "hours" && business && selectedType && (
            <HoursStep businessId={business.id} type={selectedType} onSaved={goNext} />
          )}
          {step === "services" && business && selectedType && (
            <ServicesStep businessId={business.id} type={selectedType} onSaved={goNext} />
          )}
          {step === "staff" && business && <StaffStep businessId={business.id} onSaved={goNext} />}
          {step === "done" && <DoneStep onFinish={finish} />}
        </div>
      </div>
    </div>
  );
}

function initialStepIndex(progress: ReturnType<typeof useSetupProgress>) {
  if (!progress.hasBusiness) return 0;
  if (!progress.hasBusinessType) return 1;
  if (!progress.hasHours) return 2;
  if (!progress.hasServices) return 3;
  if (!progress.hasStaff) return 4;
  return 5;
}

function ProfileStep({ onSaved }: { onSaved: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t("setup.profile.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("setup.profile.desc")}</p>
      </div>
      <BusinessForm submitLabel={t("setup.next")} skipDefaultHours onSaved={onSaved} />
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
  businessId: string;
  onSelect: (type: BusinessType) => void;
  onSaved: () => void;
}) {
  const { t, language } = useI18n();
  const updateType = useUpdateBusinessType();

  async function save() {
    if (!selected) return;
    await updateType.mutateAsync({ id: businessId, type: selected });
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t("setup.type.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("setup.type.desc")}</p>
      </div>
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
  const hours = useMemo(() => presetHours(type).map((h) => ({ ...h })), [type]);
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">{t("setup.hours.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("setup.hours.desc")}</p>
      </div>
      <BusinessHoursForm
        businessId={businessId}
        preset={hours}
        submitLabel={t("setup.next")}
        onSaved={onSaved}
      />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onSaved}>
          {t("setup.skip")}
        </Button>
      </div>
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
  const [rows, setRows] = useState<PresetService[]>(() =>
    presetServices(type).map((s) => ({ ...s })),
  );
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert(
        rows.map((r) => ({
          business_id: businessId,
          name: r.name[language],
          description: null,
          price: r.price,
          duration_minutes: r.duration_minutes,
          is_active: true,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("services.saved"));
      onSaved();
    },
    onError: () => toast.error(t("common.error")),
  });

  function update(idx: number, patch: Partial<PresetService>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function add() {
    setRows((prev) => [
      ...prev,
      {
        name: { ja: "新サービス", en: "New service" },
        duration_minutes: 60,
        price: 0,
        is_active: true,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">{t("setup.services.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("setup.services.desc")}</p>
      </div>
      <ul className="space-y-3">
        {rows.map((row, idx) => (
          <li
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
          >
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs text-muted-foreground">{t("services.name")}</Label>
              <Input
                value={row.name[language]}
                onChange={(e) =>
                  update(idx, {
                    name: { ...row.name, [language]: e.target.value },
                  })
                }
              />
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
              onClick={() => remove(idx)}
              className="text-destructive"
            >
              {t("common.remove")}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={add}>
          {t("services.add")}
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={rows.length === 0 || save.isPending}
          className="ml-auto"
        >
          {save.isPending ? t("common.saving") : t("setup.next")}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onSaved}>
          {t("setup.skip")}
        </Button>
      </div>
    </div>
  );
}

function StaffStep({ businessId, onSaved }: { businessId: string; onSaved: () => void }) {
  const { t } = useI18n();
  const [names, setNames] = useState<string[]>([""]);
  const save = useMutation({
    mutationFn: async () => {
      const valid = names.map((n) => n.trim()).filter(Boolean);
      if (valid.length === 0) return;
      const { error } = await supabase
        .from("staff")
        .insert(valid.map((name) => ({ business_id: businessId, name, is_active: true })));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("staff.saved"));
      onSaved();
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">{t("setup.staff.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("setup.staff.desc")}</p>
      </div>
      <ul className="space-y-3">
        {names.map((name, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <Input
              value={name}
              placeholder={t("staff.name")}
              onChange={(e) =>
                setNames((prev) => prev.map((n, i) => (i === idx ? e.target.value : n)))
              }
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNames((prev) => prev.filter((_, i) => i !== idx))}
              disabled={names.length === 1}
              className="text-destructive"
            >
              {t("common.remove")}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setNames((prev) => [...prev, ""])}>
          {t("staff.add")}
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={names.every((n) => !n.trim()) || save.isPending}
          className="ml-auto"
        >
          {save.isPending ? t("common.saving") : t("setup.next")}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onSaved}>
          {t("setup.skip")}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
        <span className="text-2xl">✓</span>
      </div>
      <h2 className="text-xl font-semibold">{t("setup.done.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("setup.done.desc")}</p>
      <Button onClick={onFinish} className="mx-auto">
        {t("setup.done.cta")}
      </Button>
    </div>
  );
}
