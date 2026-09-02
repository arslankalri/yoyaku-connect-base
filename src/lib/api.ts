import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
      const { error } = await supabase
        .from("business_hours")
        .upsert(
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
      const { error } = await supabase.from("services").insert({ ...input, business_id: businessId });
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
