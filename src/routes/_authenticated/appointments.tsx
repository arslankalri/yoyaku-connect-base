import { Navigate, createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointments,
  useBusiness,
  useDeleteAppointment,
  useRealtime,
  useSaveAppointment,
  useServices,
  useStaff,
  useUpdateAppointmentStatus,
  type Appointment,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments / 予約 — NAGI AI" },
      {
        name: "description",
        content: "Live appointment list: bookings taken by NAGI plus manual entries.",
      },
      { property: "og:title", content: "Appointments / 予約 — NAGI AI" },
      {
        property: "og:description",
        content: "Manage confirmed, pending, and cancelled bookings in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppointmentsPage,
});

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
type Filter = "upcoming" | "today" | "past" | "all";

type FormState = {
  id?: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  staff_id: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  notes: string;
};

function localDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  const now = new Date();
  return {
    customer_name: "",
    customer_phone: "",
    service_id: "",
    staff_id: "",
    date: localDateInput(now),
    time: "10:00",
    duration: "60",
    status: "confirmed",
    notes: "",
  };
}

function AppointmentsPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const businessId = business?.id;
  const appointmentsQuery = useAppointments(businessId);
  const servicesQuery = useServices(businessId);
  const staffQuery = useStaff(businessId);
  const saveMutation = useSaveAppointment(businessId);
  const statusMutation = useUpdateAppointmentStatus();
  const deleteMutation = useDeleteAppointment();
  useRealtime(businessId, [
    { table: "appointments", queryKey: "appointments" },
    { table: "customers", queryKey: "customers" },
  ]);

  const [filter, setFilter] = useState<Filter>("upcoming");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = appointmentsQuery.data ?? [];
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = startOfDay.getTime() + 86_400_000;
    if (filter === "all") return [...all].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    if (filter === "past")
      return all
        .filter((a) => new Date(a.ends_at).getTime() < now)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    if (filter === "today")
      return all.filter((a) => {
        const s = new Date(a.starts_at).getTime();
        return s >= startOfDay.getTime() && s < endOfDay;
      });
    return all.filter((a) => new Date(a.ends_at).getTime() >= now);
  }, [appointmentsQuery.data, filter]);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("appt.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("appt.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!business) return <Navigate to="/onboarding" replace />;

  const locale = language === "ja" ? "ja-JP" : "en-US";
  const services = (servicesQuery.data ?? []).filter((s) => s.is_active);
  const staff = (staffQuery.data ?? []).filter((s) => s.is_active);

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(appointment: Appointment) {
    const start = new Date(appointment.starts_at);
    const minutes = Math.round(
      (new Date(appointment.ends_at).getTime() - start.getTime()) / 60_000,
    );
    setForm({
      id: appointment.id,
      customer_name: appointment.customers?.name ?? "",
      customer_phone: appointment.customers?.phone ?? "",
      service_id: appointment.service_id ?? "",
      staff_id: appointment.staff_id ?? "",
      date: localDateInput(start),
      time: localTimeInput(start),
      duration: String(minutes),
      status: appointment.status,
      notes: appointment.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const start = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(start.getTime())) {
      toast.error(t("common.error"));
      return;
    }
    const minutes = Math.max(5, Number(form.duration) || 60);
    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        service_id: form.service_id || null,
        staff_id: form.staff_id || null,
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + minutes * 60_000).toISOString(),
        status: form.status,
        notes: form.notes.trim() || null,
      });
      toast.success(t("appt.saved"));
      setOpen(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

  const filters: Filter[] = ["upcoming", "today", "past", "all"];

  return (
    <AppShell
      title={t("appt.title")}
      description={t("appt.desc")}
      actions={
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          {t("appt.add")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {t(`appt.filter.${key}`)}
            </Button>
          ))}
        </div>

        {appointmentsQuery.isLoading ? (
          <LoadingPanel rows={4} />
        ) : appointmentsQuery.isError ? (
          <ErrorPanel onRetry={() => appointmentsQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("appt.empty")}
            icon={<CalendarCheck className="size-5" />}
            action={
              <Button size="sm" onClick={openCreate}>
                {t("appt.add")}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((appointment) => {
              const start = new Date(appointment.starts_at);
              const minutes = Math.round(
                (new Date(appointment.ends_at).getTime() - start.getTime()) / 60_000,
              );
              return (
                <li key={appointment.id} className="glass-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {new Intl.DateTimeFormat(locale, {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(start)}
                        <span className="text-xs font-normal text-muted-foreground">
                          · {minutes}
                          {t("common.minutes")}
                        </span>
                      </p>
                      <p className="text-sm">
                        {appointment.customers?.name ?? "—"}
                        {appointment.customers?.phone && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {appointment.customers.phone}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.services?.name ?? t("appt.noService")}
                        {appointment.staff?.name ? ` · ${appointment.staff.name}` : ""}
                      </p>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={
                            appointment.status === "cancelled" || appointment.status === "no_show"
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : appointment.status === "confirmed"
                                ? "border-success/40 bg-success/10 text-success"
                                : "border-border bg-secondary text-muted-foreground"
                          }
                        >
                          {t(`appt.status.${appointment.status}`)}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          {t(`appt.source.${appointment.source}`)}
                        </Badge>
                        {appointment.external_calendar_event_id && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t("appt.calendarSynced")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {appointment.status !== "confirmed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({ id: appointment.id, status: "confirmed" })
                            }
                          >
                            {t("appt.markConfirmed")}
                          </Button>
                        )}
                        {appointment.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({ id: appointment.id, status: "completed" })
                            }
                          >
                            {t("appt.markCompleted")}
                          </Button>
                        )}
                        {appointment.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({ id: appointment.id, status: "cancelled" })
                            }
                          >
                            {t("appt.markCancelled")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common.edit")}
                          onClick={() => openEdit(appointment)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common.delete")}
                          onClick={() => setDeleteId(appointment.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? t("appt.edit") : t("appt.add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer_name">{t("appt.customer")}</Label>
                <Input
                  id="customer_name"
                  required
                  maxLength={100}
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_phone">{t("cust.phone")}</Label>
                <Input
                  id="customer_phone"
                  maxLength={30}
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt_date">{t("appt.date")}</Label>
                <Input
                  id="appt_date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt_time">{t("appt.time")}</Label>
                <Input
                  id="appt_time"
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("appt.service")}</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(value) => {
                    const service = services.find((s) => s.id === value);
                    setForm({
                      ...form,
                      service_id: value,
                      duration: service ? String(service.duration_minutes) : form.duration,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("appt.noService")} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("appt.staff")}</Label>
                <Select
                  value={form.staff_id}
                  onValueChange={(value) => setForm({ ...form, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt_duration">{t("appt.duration")}</Label>
                <Input
                  id="appt_duration"
                  type="number"
                  min={5}
                  step={5}
                  required
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`appt.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt_notes">{t("appt.notes")}</Label>
              <Textarea
                id="appt_notes"
                maxLength={500}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(next) => !next && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteMutation.mutateAsync(deleteId);
                  toast.success(t("appt.deleted"));
                } catch {
                  toast.error(t("common.error"));
                }
                setDeleteId(null);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
