import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
};

export type BusinessHour = {
  id: string;
  business_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

export type StaffWorkingHour = {
  id: string;
  staff_id: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
};

export type StaffMember = {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
  staff_services: { service_id: string }[];
  staff_working_hours: StaffWorkingHour[];
};

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Trim "HH:MM:SS" from Postgres time values down to "HH:MM". */
export function hhmm(value: string | null | undefined) {
  return (value ?? "").slice(0, 5);
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, owner_id, name, phone, postal_code, address, website, timezone")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Business | null) ?? null;
    },
  });
}

export function useSaveBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Business> & { name: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("businesses").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (!ownerId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("businesses")
        .insert({ ...input, owner_id: ownerId })
        .select("id")
        .single();
      if (error) throw error;

      // Seed a sensible default week so hours are never empty.
      const rows = DAYS.map((day) => ({
        business_id: data.id,
        day_of_week: day,
        is_open: day !== 0,
        open_time: "09:00",
        close_time: "18:00",
      }));
      await supabase.from("business_hours").insert(rows);
      return data.id;
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
  });
}

export function useBusinessHours(businessId?: string) {
  return useQuery({
    queryKey: ["business_hours", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("id, business_id, day_of_week, is_open, open_time, close_time")
        .eq("business_id", businessId!)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as BusinessHour[];
    },
  });
}

export function useSaveBusinessHours(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      rows: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[],
    ) => {
      if (!businessId) throw new Error("No business");
      const { error } = await supabase.from("business_hours").upsert(
        rows.map((r) => ({ ...r, business_id: businessId })),
        { onConflict: "business_id,day_of_week" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business_hours"] }),
  });
}

export function useServices(businessId?: string) {
  return useQuery({
    queryKey: ["services", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, business_id, name, description, price, duration_minutes, is_active")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });
}

export type ServiceInput = {
  id?: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

export function useSaveService(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceInput) => {
      if (!businessId) throw new Error("No business");
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("services").update(rest).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("services")
        .insert({ ...input, business_id: businessId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useStaff(businessId?: string) {
  return useQuery({
    queryKey: ["staff", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select(
          "id, business_id, name, is_active, staff_services(service_id), staff_working_hours(id, staff_id, day_of_week, is_working, start_time, end_time)",
        )
        .eq("business_id", businessId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StaffMember[];
    },
  });
}

export type StaffInput = {
  id?: string;
  name: string;
  is_active: boolean;
  serviceIds: string[];
  workingHours: {
    day_of_week: number;
    is_working: boolean;
    start_time: string;
    end_time: string;
  }[];
};

export function useSaveStaff(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffInput) => {
      if (!businessId) throw new Error("No business");
      let staffId = input.id;

      if (staffId) {
        const { error } = await supabase
          .from("staff")
          .update({ name: input.name, is_active: input.is_active })
          .eq("id", staffId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("staff")
          .insert({ name: input.name, is_active: input.is_active, business_id: businessId })
          .select("id")
          .single();
        if (error) throw error;
        staffId = data.id;
      }

      const { error: delErr } = await supabase
        .from("staff_services")
        .delete()
        .eq("staff_id", staffId!);
      if (delErr) throw delErr;

      if (input.serviceIds.length > 0) {
        const { error } = await supabase
          .from("staff_services")
          .insert(input.serviceIds.map((service_id) => ({ staff_id: staffId!, service_id })));
        if (error) throw error;
      }

      const { error: hoursErr } = await supabase.from("staff_working_hours").upsert(
        input.workingHours.map((h) => ({ ...h, staff_id: staffId! })),
        { onConflict: "staff_id,day_of_week" },
      );
      if (hoursErr) throw hoursErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

/* ------------------------------------------------------------------ */
/* NAGI Control Center: settings, policies and FAQs                    */
/* ------------------------------------------------------------------ */

export const NAGI_CAPABILITIES = [
  "can_answer_faqs",
  "can_explain_services",
  "can_explain_prices",
  "can_explain_hours",
  "can_accept_appointments",
  "can_change_appointments",
  "can_cancel_appointments",
  "can_transfer_to_staff",
] as const;

export const NAGI_HANDOFF_RULES = [
  "handoff_on_request",
  "handoff_on_unknown",
  "handoff_on_complaint",
  "handoff_outside_scope",
  "handoff_manual_enabled",
] as const;

export type NagiTone = "professional" | "friendly" | "warm" | "concise";

export type NagiSettings = {
  id: string;
  business_id: string;
  is_enabled: boolean;
  tone: NagiTone;
  custom_instructions: string;
  cancellation_policy: string;
  late_arrival_policy: string;
  reservation_policy: string;
  other_policies: string;
} & Record<(typeof NAGI_CAPABILITIES)[number], boolean> &
  Record<(typeof NAGI_HANDOFF_RULES)[number], boolean>;

const NAGI_COLUMNS = [
  "id",
  "business_id",
  "is_enabled",
  "tone",
  "custom_instructions",
  "cancellation_policy",
  "late_arrival_policy",
  "reservation_policy",
  "other_policies",
  ...NAGI_CAPABILITIES,
  ...NAGI_HANDOFF_RULES,
].join(", ");

/** Read the business's NAGI configuration, creating the default row on first use. */
export function useNagiSettings(businessId?: string) {
  return useQuery({
    queryKey: ["nagi_settings", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nagi_settings")
        .select(NAGI_COLUMNS)
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as NagiSettings;

      const created = await supabase
        .from("nagi_settings")
        .insert({ business_id: businessId! })
        .select(NAGI_COLUMNS)
        .single();
      if (created.error) throw created.error;
      return created.data as unknown as NagiSettings;
    },
  });
}

export function useSaveNagiSettings(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NagiSettings>) => {
      if (!businessId) throw new Error("No business");
      const { error } = await supabase
        .from("nagi_settings")
        .update(patch)
        .eq("business_id", businessId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nagi_settings"] }),
  });
}

export type Faq = {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
};

export function useFaqs(businessId?: string) {
  return useQuery({
    queryKey: ["faqs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, business_id, question, answer, is_active, sort_order")
        .eq("business_id", businessId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Faq[];
    },
  });
}

export type FaqInput = {
  id?: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order?: number;
};

export function useSaveFaq(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FaqInput) => {
      if (!businessId) throw new Error("No business");
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("faqs").update(rest).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("faqs").insert({ ...input, business_id: businessId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faqs"] }),
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faqs"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Appointments, customers and conversations (live operational data)   */
/* ------------------------------------------------------------------ */

export type Appointment = {
  id: string;
  business_id: string;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  notes: string | null;
  external_calendar_event_id: string | null;
  customers: { id: string; name: string; phone: string | null } | null;
  services: { id: string; name: string; price: number; duration_minutes: number } | null;
  staff: { id: string; name: string } | null;
};

const APPOINTMENT_SELECT =
  "id, business_id, customer_id, staff_id, service_id, starts_at, ends_at, status, source, notes, external_calendar_event_id, customers(id, name, phone), services(id, name, price, duration_minutes), staff(id, name)";

export function useAppointments(businessId?: string, range?: { from: string; to: string }) {
  return useQuery({
    queryKey: ["appointments", businessId, range?.from ?? null, range?.to ?? null],
    enabled: !!businessId,
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("business_id", businessId!)
        .order("starts_at", { ascending: true });
      if (range) query = query.gte("starts_at", range.from).lt("starts_at", range.to);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Appointment[];
    },
  });
}

export type AppointmentInput = {
  id?: string;
  customer_name: string;
  customer_phone: string;
  service_id: string | null;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
};

export function useSaveAppointment(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      if (!businessId) throw new Error("No business");
      // Reuse an existing customer with the same phone, otherwise create one.
      let customerId: string | null = null;
      const phone = input.customer_phone.trim();
      if (phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", phone)
          .maybeSingle();
        customerId = existing?.id ?? null;
      }
      if (!customerId) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            business_id: businessId,
            name: input.customer_name.trim() || "—",
            phone: phone || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        customerId = data.id;
      }

      const row = {
        business_id: businessId,
        customer_id: customerId,
        service_id: input.service_id,
        staff_id: input.staff_id,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        status: input.status,
        notes: input.notes,
      };
      if (input.id) {
        const { error } = await supabase.from("appointments").update(row).eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("appointments").insert({ ...row, source: "manual" });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        predicate: (q) => ["appointments", "customers"].includes(String(q.queryKey[0])),
      }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export function useCustomers(businessId?: string) {
  return useQuery({
    queryKey: ["customers", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, business_id, name, phone, email, notes, created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useSaveCustomer(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      phone: string | null;
      email: string | null;
      notes: string | null;
    }) => {
      if (!businessId) throw new Error("No business");
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("customers").update(rest).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("customers")
        .insert({ ...input, business_id: businessId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export type Conversation = {
  id: string;
  business_id: string;
  channel: string;
  session_key: string | null;
  direction: string;
  status: string | null;
  transcript: string | null;
  summary: string | null;
  started_at: string | null;
  created_at: string;
  duration_seconds: number | null;
};

export function useConversations(businessId?: string) {
  return useQuery({
    queryKey: ["conversations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select(
          "id, business_id, channel, session_key, direction, status, transcript, summary, started_at, created_at, duration_seconds",
        )
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/**
 * Live updates: subscribe to Postgres changes for this business and refresh the
 * matching React Query caches, so every page reflects new data immediately.
 */
export function useRealtime(
  businessId: string | undefined,
  tables: Array<{ table: string; queryKey: string }>,
) {
  const qc = useQueryClient();
  const signature = tables.map((t) => `${t.table}:${t.queryKey}`).join("|");
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase.channel(`nagi-live-${businessId}-${signature}`);
    for (const { table, queryKey } of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `business_id=eq.${businessId}` },
        () => {
          void qc.invalidateQueries({ queryKey: [queryKey] });
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // `signature` captures the table list identity.
  }, [businessId, signature, qc]);
}
