import { createFileRoute } from "@tanstack/react-router";

import { allowAgentRequest, callerIdentity, tooManyRequests } from "@/lib/agent-rate-limit.server";
import { AgentError, contextForApiKey, runAgentTool } from "@/lib/nagi-agent.server";
import { telnyxKeyFrom, telnyxToolArgs } from "@/lib/telnyx-protocol";

/**
 * Telnyx AI Assistant webhook tool: POST /api/public/agent/telnyx/<tool_name>
 * Auth: the business's NAGI API key (Authorization: Bearer / x-nagi-api-key / ?key=).
 * Booking authority stays in runAgentTool — this route only adapts the payload.
 */
export const Route = createFileRoute("/api/public/agent/telnyx/$tool")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const url = new URL(request.url);
        try {
          const key = telnyxKeyFrom(request, url);
          if (!allowAgentRequest(callerIdentity(request, key))) return tooManyRequests();
          const ctx = await contextForApiKey(key);
          const body = await request.json().catch(() => ({}));
          const result = await runAgentTool(ctx, params.tool, telnyxToolArgs(body));
          return Response.json({ ok: true, result });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ ok: false, error: error.message }, { status: error.status });
          }
          console.error("[nagi-telnyx] tool failed", params.tool, error instanceof Error ? error.message : "");
          return Response.json(
            { ok: false, error: "The booking system could not complete this request. Do not tell the caller it succeeded." },
            { status: 500 },
          );
        }
      },
    },
  },
});
