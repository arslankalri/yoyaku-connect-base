import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Reads a shop's public website / Google Maps link, extracts its profile with AI
 * and saves it into the owner's business (only filling in what was found).
 */
export const importBusinessFromWeb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        websiteUrl: z.string().max(500).optional(),
        mapsUrl: z.string().max(1000).optional(),
        images: z.array(z.string().max(3_000_000)).max(4).optional(),
        businessType: z.string().max(40).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { extractBusiness } = await import("./business-import.server");
    const { supabase, userId } = context;
    let info;
    try {
      info = await extractBusiness({ websiteUrl: data.websiteUrl, mapsUrl: data.mapsUrl, images: data.images });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      return { ok: false as const, error: msg === "INVALID_URL" || msg === "UNREACHABLE" ? msg : "FAILED" };
    }

    const { data: existing } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    const patch = {
      name: existing?.name || info.name || "My shop",
      phone: existing?.phone || info.phone,
      postal_code: existing?.postal_code || info.postal_code,
      address: existing?.address || info.address,
      website: existing?.website || data.websiteUrl?.trim() || null,
      business_type: existing?.business_type || data.businessType || info.business_type,
      seat_capacity: existing?.seat_capacity || info.seat_capacity,
    };
    let businessId = existing?.id;
    if (businessId) {
      const { error } = await supabase.from("businesses").update(patch).eq("id", businessId);
      if (error) throw error;
    } else {
      const { data: row, error } = await supabase
        .from("businesses")
        .insert({ ...patch, owner_id: userId, timezone: "Asia/Tokyo" })
        .select("id")
        .single();
      if (error) throw error;
      businessId = row.id;
    }

    let hoursSaved = 0;
    if (info.hours.length > 0) {
      await supabase.from("business_hours").delete().eq("business_id", businessId);
      const { error } = await supabase
        .from("business_hours")
        .insert(info.hours.map((h) => ({ ...h, business_id: businessId! })));
      if (!error) hoursSaved = info.hours.filter((h) => h.is_open).length;
    }

    const { data: curServices } = await supabase
      .from("services")
      .select("name")
      .eq("business_id", businessId);
    const haveS = new Set((curServices ?? []).map((s) => s.name));
    const newServices = info.services.filter((s) => !haveS.has(s.name));
    if (newServices.length > 0) {
      await supabase
        .from("services")
        .insert(newServices.map((s) => ({ ...s, business_id: businessId!, is_active: true })));
    }

    const { data: curFaqs } = await supabase
      .from("faqs")
      .select("question")
      .eq("business_id", businessId);
    const haveF = new Set((curFaqs ?? []).map((f) => f.question));
    const newFaqs = info.faqs.filter((f) => !haveF.has(f.question));
    if (newFaqs.length > 0) {
      await supabase.from("faqs").insert(
        newFaqs.map((f, i) => ({
          question: f.question.slice(0, 300),
          answer: f.answer.slice(0, 2000),
          business_id: businessId!,
          is_active: true,
          sort_order: (curFaqs?.length ?? 0) + i,
        })),
      );
    }

    return {
      ok: true as const,
      name: patch.name,
      hours: hoursSaved,
      services: newServices.length,
      faqs: newFaqs.length,
      missing: info.missing,
    };
  });
