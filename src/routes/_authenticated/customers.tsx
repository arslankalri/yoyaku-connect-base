import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointments,
  useBusiness,
  useCustomers,
  useDeleteCustomer,
  useRealtime,
  useSaveCustomer,
  type Customer,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers / 顧客 — NAGI AI" },
      {
        name: "description",
        content: "Live customer records created from bookings and manual entries.",
      },
      { property: "og:title", content: "Customers / 顧客 — NAGI AI" },
      { property: "og:description", content: "Manage customer contacts and booking history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

type FormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY: FormState = { name: "", phone: "", email: "", notes: "" };

function CustomersPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const businessId = business?.id;
  const customersQuery = useCustomers(businessId);
  const appointmentsQuery = useAppointments(businessId);
  const saveMutation = useSaveCustomer(businessId);
  const deleteMutation = useDeleteCustomer();
  useRealtime(businessId, [
    { table: "customers", queryKey: "customers" },
    { table: "appointments", queryKey: "appointments" },
  ]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; last: string | null }>();
    for (const appointment of appointmentsQuery.data ?? []) {
      if (!appointment.customer_id) continue;
      const entry = map.get(appointment.customer_id) ?? { count: 0, last: null };
      entry.count += 1;
      if (!entry.last || appointment.starts_at > entry.last) entry.last = appointment.starts_at;
      map.set(appointment.customer_id, entry);
    }
    return map;
  }, [appointmentsQuery.data]);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("cust.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }
  if (businessQuery.isError) {
    return (
      <AppShell title={t("cust.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }
  if (!business) return <Navigate to="/onboarding" replace />;

  const locale = language === "ja" ? "ja-JP" : "en-US";
  const needle = search.trim().toLowerCase();
  const rows = (customersQuery.data ?? []).filter((customer) =>
    needle
      ? [customer.name, customer.phone, customer.email]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle))
      : true,
  );

  function openEdit(customer: Customer) {
    setForm({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      notes: customer.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success(t("cust.saved"));
      setOpen(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <AppShell
      title={t("cust.title")}
      description={t("cust.desc")}
      actions={
        <Button
          className="gap-1.5"
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("cust.add")}
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          className="max-w-xs"
        />

        {customersQuery.isLoading ? (
          <LoadingPanel rows={4} />
        ) : customersQuery.isError ? (
          <ErrorPanel onRetry={() => customersQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("cust.empty")} icon={<Users className="size-5" />} />
        ) : (
          <ul className="space-y-3">
            {rows.map((customer) => {
              const stat = stats.get(customer.id);
              return (
                <li
                  key={customer.id}
                  className="glass-panel flex flex-wrap items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {customer.notes && (
                      <p className="text-xs text-muted-foreground">{customer.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground">
                      <p>
                        {t("cust.visits")}: {stat?.count ?? 0}
                      </p>
                      <p>
                        {t("cust.lastVisit")}:{" "}
                        {stat?.last
                          ? new Intl.DateTimeFormat(locale, {
                              month: "short",
                              day: "numeric",
                            }).format(new Date(stat.last))
                          : "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.edit")}
                      onClick={() => openEdit(customer)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleteId(customer.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("cust.edit") : t("cust.add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust_name">{t("cust.name")}</Label>
              <Input
                id="cust_name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust_phone">{t("cust.phone")}</Label>
                <Input
                  id="cust_phone"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust_email">{t("cust.email")}</Label>
                <Input
                  id="cust_email"
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust_notes">{t("cust.notes")}</Label>
              <Textarea
                id="cust_notes"
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
                  toast.success(t("cust.deleted"));
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
