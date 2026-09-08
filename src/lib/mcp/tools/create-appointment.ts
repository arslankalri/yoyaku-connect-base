import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { currentBusiness, json, noBusiness } from "../supabase";

export default defineTool({
  name: "create_appointment",
  title: "Create appointment",
  description:
    "Book an appointment in the signed-in owner's business. The end time is derived from the service duration. Creates the customer record when needed.",
  inputSchema: {
    service_id: z.string().uuid().describe("Service id from get_business_overview."),
    starts_at: z.string().describe("Start time as an ISO 8601 timestamp with offset."),
    customer_name: z.string().trim().min(1),
    customer_phone: z.string().trim().min(1).optional(),
    staff_id: z.string().uuid().optional(),
    notes: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const { supabase, business } = await currentBusiness(ctx);
    if (!business) return noBusiness();

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, duration_minutes")
      .eq("business_id", business.id)
      .eq("id", input.service_id)
      .maybeSingle();
    if (serviceError)
      return { content: [{ type: "text", text: serviceError.message }], isError: true };
    if (!service)
      return {
        content: [{ type: "text", text: "That service does not belong to this business." }],
        isError: true,
      };

    const start = new Date(input.starts_at);
    if (Number.isNaN(start.getTime()))
      return { content: [{ type: "text", text: "starts_at is not a valid timestamp." }], isError: true };
    const end = new Date(start.getTime() + service.duration_minutes * 60_000);

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .eq("name", input.customer_name)
      .limit(1)
      .maybeSingle();

    let customerId = existing?.id ?? null;
    if (!customerId) {
      const { data: created, error: customerError } = await supabase
        .from("customers")
        .insert({
          business_id: business.id,
          name: input.customer_name,
          phone: input.customer_phone ?? null,
        })
        .select("id")
        .single();
      if (customerError)
        return { content: [{ type: "text", text: customerError.message }], isError: true };
      customerId = created.id;
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        business_id: business.id,
        service_id: service.id,
        customer_id: customerId,
        staff_id: input.staff_id ?? null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes: input.notes ?? null,
        source: "mcp",
        status: "scheduled",
      })
      .select("id, starts_at, ends_at, status")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return json({ appointment: data, service: service.name });
  },
});
