import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useBusiness,
  useDeleteService,
  useSaveService,
  useServices,
  type Service,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "Services / サービス — NAGI AI" },
      { name: "description", content: "Create, edit, and remove the services your business offers." },
      { property: "og:title", content: "Services — NAGI AI" },
      { property: "og:description", content: "Manage your service menu, pricing, and duration." },
    ],
  }),
  component: ServicesPage,
});

type FormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "0",
  duration_minutes: "60",
  is_active: true,
};

function ServicesPage() {
  const { t } = useI18n();
  const businessQuery = useBusiness();
  const businessId = businessQuery.data?.id;
  const servicesQuery = useServices(businessId);
  const saveService = useSaveService(businessId);
  const deleteService = useDeleteService();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("services.title")}>
        <LoadingPanel />
      </AppShell>
    );
  }
  if (!businessQuery.data) return <Navigate to="/onboarding" replace />;

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      description: service.description ?? "",
      price: String(service.price ?? 0),
      duration_minutes: String(service.duration_minutes),
      is_active: service.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (form.name.trim().length === 0) {
      setFormError(t("services.errName"));
      return;
    }
    try {
      await saveService.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        duration_minutes: Math.max(5, Number(form.duration_minutes) || 60),
        is_active: form.is_active,
      });
      toast.success(form.id ? t("services.updated") : t("services.created"));
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await deleteService.mutateAsync(deleteTarget.id);
      toast.success(t("services.deleted"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleteTarget(null);
    }
  }

  const services = servicesQuery.data ?? [];

  return (
    <AppShell
      title={t("services.title")}
      description={t("services.desc")}
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> {t("services.new")}
        </Button>
      }
    >
      {servicesQuery.isLoading ? (
        <LoadingPanel />
      ) : servicesQuery.isError ? (
        <ErrorPanel onRetry={() => servicesQuery.refetch()} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={<Scissors className="size-5" />}
          title={t("services.empty")}
          action={
            <Button size="sm" onClick={openCreate}>
              {t("services.emptyCta")}
            </Button>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-border">
            {services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-start gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{service.name}</p>
                    <Badge
                      variant="outline"
                      className={
                        service.is_active
                          ? "border-success/40 bg-success/10 text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {service.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>
                  {service.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    ¥{Number(service.price).toLocaleString("ja-JP")} · {service.duration_minutes}{" "}
                    {t("common.minutes")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(service)}>
                    <Pencil className="size-3.5" /> {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(service)}
                  >
                    <Trash2 className="size-3.5" /> {t("common.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t("services.edit") : t("services.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">
                {t("services.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="svc-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">{t("services.description")}</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                maxLength={1000}
                rows={3}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="svc-price">{t("services.price")}</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step={100}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-duration">{t("services.duration")}</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="svc-active">{t("common.status")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {form.is_active ? t("common.active") : t("common.inactive")}
                </span>
                <Switch
                  id="svc-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saveService.isPending}>
                {saveService.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} — {t("common.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
