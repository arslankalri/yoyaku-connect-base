import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { currentBusiness, json, noBusiness } from "../supabase";

export default defineTool({
  name: "cancel_appointment",
  title: "Cancel appointment",
  description: "Mark an appointment of the signed-in owner's business as cancelled.",
  inputSchema: {
    appointment_id: z.string().uuid(),
    reason: z.string().trim().max(300).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ appointment_id, reason }, ctx) => {
    const { supabase, business } = await currentBusiness(ctx);
    if (!business) return noBusiness();

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        ...(reason ? { notes: reason } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", business.id)
      .eq("id", appointment_id)
      .select("id, status, starts_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "No matching appointment for this business." }],
        isError: true,
      };
    return json({ appointment: data });
  },
});
