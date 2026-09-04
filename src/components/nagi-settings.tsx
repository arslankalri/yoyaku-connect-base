import { MessageSquare, Save, ShieldCheck, Sparkles, UserRoundCog } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorPanel, LoadingPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  NAGI_CAPABILITIES,
  NAGI_HANDOFF_RULES,
  useNagiSettings,
  useSaveNagiSettings,
  type NagiSettings,
  type NagiTone,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TONES: NagiTone[] = ["professional", "friendly", "warm", "concise"];

function ToggleRow({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  id: string;
}) {
  const { t } = useI18n();
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "text-[11px] font-medium",
            checked ? "text-success" : "text-muted-foreground",
          )}
        >
          {checked ? t("common.active") : t("common.inactive")}
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
    </li>
  );
}

export function NagiSettingsPanel({
  businessId,
  onTest,
}: {
  businessId: string;
  onTest?: () => void;
}) {
  const { t } = useI18n();
  const query = useNagiSettings(businessId);
  const save = useSaveNagiSettings(businessId);
  const [draft, setDraft] = useState<NagiSettings | null>(null);

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  if (query.isLoading || !draft) return <LoadingPanel rows={5} />;
  if (query.isError) return <ErrorPanel onRetry={() => query.refetch()} />;

  function patch(next: Partial<NagiSettings>) {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
  }

  async function persist(next?: Partial<NagiSettings>) {
    const merged = { ...draft!, ...(next ?? {}) };
    const { id: _id, business_id: _bid, ...payload } = merged;
    try {
      await save.mutateAsync(payload);
      toast.success(t("nagi.saved"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="space-y-4">
      {/* NAGI status */}
      <section className="glass-panel glow-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {t("nagi.status.title")}
            </p>
            <p className="mt-2 text-base font-semibold">
              {draft.is_enabled ? t("nagi.online") : t("nagi.offline")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("nagi.status.desc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="nagi-enabled"
              checked={draft.is_enabled}
              onCheckedChange={(value) => {
                patch({ is_enabled: value });
                void persist({ is_enabled: value });
              }}
            />
            <Label htmlFor="nagi-enabled" className="text-sm">
              {draft.is_enabled ? "ON" : "OFF"}
            </Label>
          </div>
        </div>
        {onTest && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onTest}>
            <MessageSquare className="size-4" />
            {t("nagi.testSettings")}
          </Button>
        )}
      </section>

      {/* Capabilities */}
      <section className="glass-panel p-5">
        <p className="eyebrow flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" />
          {t("nagi.caps.title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("nagi.caps.desc")}</p>
        <ul className="mt-3 divide-y divide-border">
          {NAGI_CAPABILITIES.map((key) => (
            <ToggleRow
              key={key}
              id={`cap-${key}`}
              label={t(`nagi.cap.${key}`)}
              checked={draft[key]}
              onChange={(value) => {
                patch({ [key]: value } as Partial<NagiSettings>);
                void persist({ [key]: value } as Partial<NagiSettings>);
              }}
            />
          ))}
        </ul>
      </section>

      {/* Personality */}
      <section className="glass-panel p-5">
        <p className="eyebrow flex items-center gap-1.5">
          <UserRoundCog className="size-3.5" />
          {t("nagi.tone.title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("nagi.tone.desc")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => {
                patch({ tone });
                void persist({ tone });
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                draft.tone === tone
                  ? "border-ai-indigo/50 bg-ai-indigo/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={draft.tone === tone}
            >
              {t(`nagi.tone.${tone}`)}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <Label htmlFor="nagi-instructions" className="text-sm font-medium">
            {t("nagi.instructions.title")}
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">{t("nagi.instructions.desc")}</p>
          <Textarea
            id="nagi-instructions"
            className="mt-2 min-h-24 bg-background/70"
            maxLength={1000}
            placeholder={t("nagi.instructions.placeholder")}
            value={draft.custom_instructions}
            onChange={(e) => patch({ custom_instructions: e.target.value })}
          />
          <Button
            className="mt-3"
            size="sm"
            disabled={save.isPending}
            onClick={() => void persist()}
          >
            <Save className="size-4" />
            {save.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </section>

      {/* Human handoff */}
      <section className="glass-panel p-5">
        <p className="eyebrow">{t("nagi.handoff.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("nagi.handoff.desc")}</p>
        <ul className="mt-3 divide-y divide-border">
          {NAGI_HANDOFF_RULES.map((key) => (
            <ToggleRow
              key={key}
              id={`handoff-${key}`}
              label={t(`nagi.handoff.${key}`)}
              checked={draft[key]}
              onChange={(value) => {
                patch({ [key]: value } as Partial<NagiSettings>);
                void persist({ [key]: value } as Partial<NagiSettings>);
              }}
            />
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("nagi.handoff.note")}
        </p>
      </section>

      {/* Business policies */}
      <section className="glass-panel p-5">
        <p className="eyebrow">{t("nagi.policies.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("nagi.policies.desc")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              [
                "cancellation_policy",
                "nagi.policy.cancellation",
                "nagi.policy.cancellationPlaceholder",
              ],
              ["late_arrival_policy", "nagi.policy.late", "nagi.policy.latePlaceholder"],
              [
                "reservation_policy",
                "nagi.policy.reservation",
                "nagi.policy.reservationPlaceholder",
              ],
              ["other_policies", "nagi.policy.other", "nagi.policy.otherPlaceholder"],
            ] as const
          ).map(([field, labelKey, placeholderKey]) => (
            <div key={field}>
              <Label htmlFor={field} className="text-sm font-medium">
                {t(labelKey)}
              </Label>
              <Textarea
                id={field}
                className="mt-2 min-h-20 bg-background/70"
                maxLength={800}
                placeholder={t(placeholderKey)}
                value={draft[field]}
                onChange={(e) => patch({ [field]: e.target.value } as Partial<NagiSettings>)}
              />
            </div>
          ))}
        </div>
        <Button className="mt-4" size="sm" disabled={save.isPending} onClick={() => void persist()}>
          <Save className="size-4" />
          {save.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </section>
    </div>
  );
}
