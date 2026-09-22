import { createFileRoute } from "@tanstack/react-router";

import { AgentError, contextForApiKey, defaultVoiceGreeting, toolDeclarations, voiceSystemPrompt } from "@/lib/nagi-agent.server";

function keyFrom(request: Request, url: URL) {
  const header = request.headers.get("x-nagi-api-key") ?? request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return (token || url.searchParams.get("key") || "").trim();
}

export const Route = createFileRoute("/api/public/agent/vapi/web-config")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);

        try {
          const key = keyFrom(request, url);
          if (!key) throw new AgentError(401, "Missing API key");

          const ctx = await contextForApiKey(key);
          if (!ctx.voiceEnabled) throw new AgentError(409, "NAGI voice calling is turned off");

          const body = (await request.json().catch(() => ({}))) as {
            sessionId?: string;
            userId?: string;
          };

          const webhook = {
            url: `${url.origin}/api/public/agent/vapi`,
            secret: key,
          };

          const assistant = {
            name: `NAGI Web — ${ctx.business.name}`,
            firstMessage: defaultVoiceGreeting(ctx.business.name, ctx.greeting),
            firstMessageMode: "assistant-speaks-first",
            transcriber: { provider: "deepgram", model: "nova-2", language: "ja" },
            voice: { provider: "azure", voiceId: "ja-JP-NanamiNeural" },
            model: {
              provider: "openai",
              model: "gpt-4o",
              temperature: 0.4,
              messages: [{ role: "system", content: await voiceSystemPrompt(ctx) }],
              tools: toolDeclarations().map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
                server: webhook,
              })),
            },
            serverMessages: [
              "status-update",
              "transcript",
              "tool-calls",
              "end-of-call-report",
            ],
            server: webhook,
            metadata: {
              nagiBusinessId: ctx.business.id,
              nagiSessionId: body.sessionId ?? null,
              nagiUserId: body.userId ?? null,
            },
          };

          return Response.json({ assistant });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          const detail = error instanceof Error ? error.message : "Unable to build NAGI web assistant";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
