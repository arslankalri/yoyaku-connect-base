import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { currentBusiness, json, noBusiness } from "../supabase";

export default defineTool({
  name: "list_appointments",
  title: "List appointments",
  description:
    "List appointments for the signed-in owner's business, optionally filtered by date range and status.",
  inputSchema: {
    from: z.string().optional().describe("ISO date or datetime lower bound, e.g. 2026-09-08."),
    to: z.string().optional().describe("ISO date or datetime upper bound."),
    status: z
      .enum(["scheduled", "cancelled", "completed", "no_show"])
      .optional()
      .describe("Filter by appointment status."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status, limit }, ctx) => {
    const { supabase, business } = await currentBusiness(ctx);
    if (!business) return noBusiness();

    let query = supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, source, notes, services(name, price, duration_minutes), staff(name), customers(name, phone)",
      )
      .eq("business_id", business.id)
      .order("starts_at", { ascending: true })
      .limit(limit ?? 25);

    if (from) query = query.gte("starts_at", from);
    if (to) query = query.lte("starts_at", to);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return json({ timezone: business.timezone, appointments: data ?? [] });
  },
});
