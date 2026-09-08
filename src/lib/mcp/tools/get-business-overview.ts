import { defineTool } from "@lovable.dev/mcp-js";

import { currentBusiness, json, noBusiness } from "../supabase";

export default defineTool({
  name: "get_business_overview",
  title: "Get business overview",
  description:
    "Return the signed-in owner's business profile plus its weekly opening hours, services and staff.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const { supabase, business } = await currentBusiness(ctx);
    if (!business) return noBusiness();

    const [hours, services, staff] = await Promise.all([
      supabase
        .from("business_hours")
        .select("day_of_week, is_open, open_time, close_time")
        .eq("business_id", business.id)
        .order("day_of_week"),
      supabase
        .from("services")
        .select("id, name, price, duration_minutes, is_active")
        .eq("business_id", business.id)
        .order("name"),
      supabase
        .from("staff")
        .select("id, name, is_active")
        .eq("business_id", business.id)
        .order("name"),
    ]);

    return json({
      business,
      opening_hours: hours.data ?? [],
      services: services.data ?? [],
      staff: staff.data ?? [],
    });
  },
});
