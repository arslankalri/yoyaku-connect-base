import { createFileRoute } from "@tanstack/react-router";

import { AgentError, contextForApiKey } from "@/lib/nagi-agent.server";

function keyFrom(request: Request) {
  const header = request.headers.get("x-nagi-api-key") ?? request.headers.get("authorization") ?? "";
  return (header.startsWith("Bearer ") ? header.slice(7) : header).trim();
}

export const Route = createFileRoute("/api/public/agent/vapi/web-start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = keyFrom(request);
          if (!key) throw new AgentError(401, "Missing API key");

          const ctx = await contextForApiKey(key);
          if (!ctx.voiceEnabled) throw new AgentError(409, "NAGI voice calling is turned off");

          return Response.json({
            businessId: ctx.business.id,
            businessName: ctx.business.name,
            webhookPath: "/api/public/agent/vapi",
            configured: true,
          });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          const detail = error instanceof Error ? error.message : "Unable to start NAGI web calling";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
