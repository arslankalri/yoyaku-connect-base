import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { currentBusiness, json, noBusiness } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description: "List or search the customers of the signed-in owner's business.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Match against customer name or phone."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    const { supabase, business } = await currentBusiness(ctx);
    if (!business) return noBusiness();

    let query = supabase
      .from("customers")
      .select("id, name, phone, email, notes, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return json({ customers: data ?? [] });
  },
});
