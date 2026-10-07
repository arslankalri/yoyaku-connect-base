import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * For "Other" businesses: the owner describes what they actually do, and AI
 * drafts fitting services and FAQs. Only fills empty lists — never overwrites.
 */
export const analyzeCustomBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ description: z.string().trim().min(2).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!biz) return { ok: false as const, error: "NO_BUSINESS" };

    await supabase
      .from("businesses")
      .update({ business_description: data.description })
      .eq("id", biz.id);

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "FAILED" };

    const [{ generateText }, { createLovableAiGatewayProvider }, { NAGI_MODEL }] =
      await Promise.all([
        import("ai"),
        import("@/lib/ai-gateway.server"),
        import("@/lib/nagi-brain.server"),
      ]);
    const gateway = createLovableAiGatewayProvider(key);
    let parsed: {
      services?: { name?: string; duration_minutes?: number }[];
      faqs?: { question?: string; answer?: string }[];
    } = {};
    try {
      const { text } = await generateText({
        model: gateway(NAGI_MODEL),
        system: `You help a Japanese small business set up an AI receptionist. Given the owner's description of their business, return ONLY JSON:
{"services":[{"name":string,"duration_minutes":number}],"faqs":[{"question":string,"answer":string}]}
- services: 3-6 things a customer would book or call about (e.g. for a used-car dealer: "Car viewing / test drive", "Trade-in appraisal", "Purchase consultation"). Realistic durations.
- faqs: 2-4 generic questions customers of this kind of business ask, with answers that do NOT invent prices, addresses, hours or promises — answers should say staff will confirm specifics where needed.
- Write names/questions/answers in the same language as the description.`,
        prompt: `Business name: ${biz.name}\nDescription: ${data.description}`,
      });
      parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch {
      return { ok: false as const, error: "FAILED" };
    }

    const services = (parsed.services ?? [])
      .filter((s) => typeof s.name === "string" && s.name.trim())
      .slice(0, 6)
      .map((s) => ({
        business_id: biz.id,
        name: s.name!.trim().slice(0, 120),
        duration_minutes: Math.min(480, Math.max(10, Math.round(Number(s.duration_minutes) || 60))),
        price: 0,
        is_active: true,
      }));
    const faqs = (parsed.faqs ?? [])
      .filter((f) => f.question?.trim() && f.answer?.trim())
      .slice(0, 4)
      .map((f, i) => ({
        business_id: biz.id,
        question: f.question!.trim().slice(0, 300),
        answer: f.answer!.trim().slice(0, 2000),
        is_active: true,
        sort_order: i,
      }));

    let servicesAdded = 0;
    let faqsAdded = 0;
    const { count: svcCount } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id);
    if (!svcCount && services.length) {
      const { error } = await supabase.from("services").insert(services);
      if (!error) servicesAdded = services.length;
    }
    const { count: faqCount } = await supabase
      .from("faqs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id);
    if (!faqCount && faqs.length) {
      const { error } = await supabase.from("faqs").insert(faqs);
      if (!error) faqsAdded = faqs.length;
    }
    return { ok: true as const, servicesAdded, faqsAdded };
  });
