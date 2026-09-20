import { createFileRoute } from "@tanstack/react-router";

import { allowAgentRequest, callerIdentity, tooManyRequests } from "@/lib/agent-rate-limit.server";
import { AgentError, contextForApiKey, runAgentTool } from "@/lib/nagi-agent.server";

/**
 * Per-business receptionist API: POST /api/public/agent/<tool_name>
 *
 * Auth: the business's own API key, sent as `x-nagi-api-key`,
 * `x-vapi-secret` or `Authorization: Bearer <key>`.
 * Everything the API touches is scoped to that one business.
 */
function apiKeyFrom(request: Request) {
  const header =
    request.headers.get("x-nagi-api-key") ??
    request.headers.get("x-vapi-secret") ??
    request.headers.get("authorization") ??
    "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

export const Route = createFileRoute("/api/public/agent/$tool")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const key = apiKeyFrom(request);
          if (!allowAgentRequest(callerIdentity(request, key))) return tooManyRequests();
          const ctx = await contextForApiKey(key);
          const body = await request.json().catch(() => ({}));
          const args =
            body && typeof body === "object" && "arguments" in body
              ? (body as { arguments: unknown }).arguments
              : body;
          const result = await runAgentTool(ctx, params.tool, args);
          return Response.json({ ok: true, result });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ ok: false, error: error.message }, { status: error.status });
          }
          const message = error instanceof Error ? error.message : "Request failed";
          console.error("[nagi-agent] tool failed", error);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
