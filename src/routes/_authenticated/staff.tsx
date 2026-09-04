import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DAYS,
  hhmm,
  useBusiness,
  useDeleteStaff,
  useSaveStaff,
  useServices,
  useStaff,
  type StaffMember,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff / スタッフ — NAGI AI" },
      {
        name: "description",
        content: "Manage staff members, the services they provide, and their working hours.",
      },
      { property: "og:title", content: "Staff — NAGI AI" },
      { property: "og:description", content: "Staff, assigned services, and working hours." },
    ],
  }),
  component: StaffPage,
});

type DayRow = { day_of_week: number; is_working: boolean; start_time: string; end_time: string };

type FormState = {
  id?: string;
  name: string;
  is_active: boolean;
  serviceIds: string[];
  days: DayRow[];
};

function blankDays(): DayRow[] {
  return DAYS.map((day) => ({
    day_of_week: day,
    is_working: day !== 0,
    start_time: "09:00",
    end_time: "18:00",
  }));
}

const emptyForm: FormState = { name: "", is_active: true, serviceIds: [], days: blankDays() };

function StaffPage() {
  const { t } = useI18n();
  const businessQuery = useBusiness();
  const businessId = businessQuery.data?.id;
  const servicesQuery = useServices(businessId);
  const staffQuery = useStaff(businessId);
  const saveStaff = useSaveStaff(businessId);
  const deleteStaff = useDeleteStaff();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("staff.title")}>
        <LoadingPanel />
      </AppShell>
    );
  }
  if (!businessQuery.data) return <Navigate to="/onboarding" replace />;

  const services = servicesQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  function openCreate() {
    setForm({ ...emptyForm, days: blankDays(), serviceIds: [] });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(member: StaffMember) {
    setForm({
      id: member.id,
      name: member.name,
      is_active: member.is_active,
      serviceIds: member.staff_services.map((s) => s.service_id),
      days: DAYS.map((day) => {
        const match = member.staff_working_hours.find((h) => h.day_of_week === day);
        return {
          day_of_week: day,
          is_working: match ? match.is_working : false,
          start_time: hhmm(match?.start_time) || "09:00",
          end_time: hhmm(match?.end_time) || "18:00",
        };
      }),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (form.name.trim().length === 0) {
      setFormError(t("staff.errName"));
      return;
    }
    try {
      await saveStaff.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        is_active: form.is_active,
        serviceIds: form.serviceIds,
        workingHours: form.days.map((d) => ({
          day_of_week: d.day_of_week,
          is_working: d.is_working,
          start_time: d.start_time,
          end_time: d.end_time,
        })),
      });
      toast.success(form.id ? t("staff.updated") : t("staff.created"));
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await deleteStaff.mutateAsync(deleteTarget.id);
      toast.success(t("staff.deleted"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleteTarget(null);
    }
  }

  function serviceNames(member: StaffMember) {
    const names = member.staff_services
      .map((link) => services.find((s) => s.id === link.service_id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join("、") : t("common.none");
  }

  return (
    <AppShell
      title={t("staff.title")}
      description={t("staff.desc")}
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> {t("staff.new")}
        </Button>
      }
    >
      {staffQuery.isLoading ? (
        <LoadingPanel />
      ) : staffQuery.isError ? (
        <ErrorPanel onRetry={() => staffQuery.refetch()} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="size-5" />}
          title={t("staff.empty")}
          action={
            services.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">{t("staff.noServices")}</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/services">{t("services.emptyCta")}</Link>
                </Button>
                <Button size="sm" onClick={openCreate}>
                  {t("staff.emptyCta")}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={openCreate}>
                {t("staff.emptyCta")}
              </Button>
            )
          }
        />
      ) : (
        <div className="glass-panel overflow-hidden">
          <ul className="divide-y divide-border">
            {staff.map((member) => {
              const workingDays = member.staff_working_hours
                .filter((h) => h.is_working)
                .sort((a, b) => a.day_of_week - b.day_of_week);
              return (
                <li key={member.id} className="flex flex-wrap items-start gap-4 p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          member.is_active
                            ? "border-success/40 bg-success/10 text-success"
                            : "text-muted-foreground"
                        }
                      >
                        {member.is_active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground/70">{t("staff.services")}:</span>{" "}
                      {serviceNames(member)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {workingDays.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("common.none")}</span>
                      ) : (
                        workingDays.map((h) => (
                          <span
                            key={h.id}
                            className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {t(`dayShort.${h.day_of_week}`)} {hhmm(h.start_time)}–{hhmm(h.end_time)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                      <Pencil className="size-3.5" /> {t("common.edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(member)}
                    >
                      <Trash2 className="size-3.5" /> {t("common.delete")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? t("staff.edit") : t("staff.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">
                {t("staff.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("staff.services")}</Label>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("staff.noServices")}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map((service) => {
                    const checked = form.serviceIds.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              serviceIds: value
                                ? [...prev.serviceIds, service.id]
                                : prev.serviceIds.filter((id) => id !== service.id),
                            }))
                          }
                        />
                        <span className="truncate">{service.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("staff.workingHours")}</Label>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {form.days.map((day) => (
                  <li
                    key={day.day_of_week}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
                  >
                    <span className="w-20 shrink-0 text-sm">{t(`day.${day.day_of_week}`)}</span>
                    <Switch
                      checked={day.is_working}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          days: prev.days.map((d) =>
                            d.day_of_week === day.day_of_week ? { ...d, is_working: checked } : d,
                          ),
                        }))
                      }
                      aria-label={t("staff.workingDays")}
                    />
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        type="time"
                        className="w-28"
                        value={day.start_time}
                        disabled={!day.is_working}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            days: prev.days.map((d) =>
                              d.day_of_week === day.day_of_week
                                ? { ...d, start_time: e.target.value }
                                : d,
                            ),
                          }))
                        }
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="time"
                        className="w-28"
                        value={day.end_time}
                        disabled={!day.is_working}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            days: prev.days.map((d) =>
                              d.day_of_week === day.day_of_week
                                ? { ...d, end_time: e.target.value }
                                : d,
                            ),
                          }))
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="staff-active">{t("common.status")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {form.is_active ? t("common.active") : t("common.inactive")}
                </span>
                <Switch
                  id="staff-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saveStaff.isPending}>
                {saveStaff.isPending ? t("common.saving") : t("common.save")}
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
