import { HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteFaq, useFaqs, useSaveFaq, type Faq } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Draft = { id?: string; question: string; answer: string; is_active: boolean };

const EMPTY: Draft = { question: "", answer: "", is_active: true };

export function FaqManager({ businessId }: { businessId: string }) {
  const { t } = useI18n();
  const faqsQuery = useFaqs(businessId);
  const saveFaq = useSaveFaq(businessId);
  const deleteFaq = useDeleteFaq();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  function openNew() {
    setDraft(EMPTY);
    setOpen(true);
  }

  function openEdit(faq: Faq) {
    setDraft({ id: faq.id, question: faq.question, answer: faq.answer, is_active: faq.is_active });
    setOpen(true);
  }

  async function onSubmit() {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    try {
      await saveFaq.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        is_active: draft.is_active,
      });
      toast.success(t("faq.saved"));
      setOpen(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t("faq.deleteConfirm"))) return;
    try {
      await deleteFaq.mutateAsync(id);
      toast.success(t("faq.deleted"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function onToggle(faq: Faq, value: boolean) {
    try {
      await saveFaq.mutateAsync({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        is_active: value,
      });
    } catch {
      toast.error(t("common.error"));
    }
  }

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          {t("faq.add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? t("faq.edit") : t("faq.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="faq-question">{t("faq.question")}</Label>
            <Input
              id="faq-question"
              className="mt-2"
              maxLength={300}
              placeholder={t("faq.questionPlaceholder")}
              value={draft.question}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="faq-answer">{t("faq.answer")}</Label>
            <Textarea
              id="faq-answer"
              className="mt-2 min-h-24"
              maxLength={1000}
              placeholder={t("faq.answerPlaceholder")}
              value={draft.answer}
              onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="faq-active"
              checked={draft.is_active}
              onCheckedChange={(value) => setDraft((d) => ({ ...d, is_active: value }))}
            />
            <Label htmlFor="faq-active" className="text-sm font-normal">
              {t("faq.activeLabel")}
            </Label>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("faq.langNote")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saveFaq.isPending || !draft.question.trim() || !draft.answer.trim()}
          >
            {saveFaq.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (faqsQuery.isLoading) return <LoadingPanel rows={3} />;
  if (faqsQuery.isError) return <ErrorPanel onRetry={() => faqsQuery.refetch()} />;

  const faqs = faqsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <HelpCircle className="size-3.5" />
            {t("faq.title")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("faq.desc")}</p>
        </div>
        {dialog}
      </div>

      {faqs.length === 0 ? (
        <EmptyState title={t("faq.empty")} icon={<HelpCircle className="size-5" />} />
      ) : (
        <ul className="space-y-3">
          {faqs.map((faq) => (
            <li key={faq.id} className="glass-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{faq.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Switch
                    aria-label={t("faq.activeLabel")}
                    checked={faq.is_active}
                    onCheckedChange={(value) => void onToggle(faq, value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("faq.edit")}
                    onClick={() => openEdit(faq)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.delete")}
                    onClick={() => void onDelete(faq.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
