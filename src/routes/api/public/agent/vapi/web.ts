import { createFileRoute } from "@tanstack/react-router";

import {
  AgentError,
  contextForApiKey,
  defaultVoiceGreeting,
  toolDeclarations,
  voiceSystemPrompt,
} from "@/lib/nagi-agent.server";

function keyFrom(request: Request, url: URL) {
  const header =
    request.headers.get("x-nagi-api-key") ??
    request.headers.get("authorization") ??
    "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return (token || url.searchParams.get("key") || "").trim();
}

export const Route = createFileRoute("/api/public/agent/vapi/web")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const key = keyFrom(request, url);
          if (!key) throw new AgentError(401, "Missing API key");

          const ctx = await contextForApiKey(key);
          if (!ctx.voiceEnabled) {
            return Response.json(
              { error: "Phone reception is turned off for this business." },
              { status: 409 },
            );
          }

          const body = (await request.json().catch(() => ({}))) as {
            sessionId?: string;
            userId?: string;
          };

          const assistant = {
            name: `NAGI — ${ctx.business.name}`,
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
                server: {
                  url: `${url.origin}/api/public/agent/vapi`,
                  secret: key,
                },
              })),
            },
            serverMessages: [
              "status-update",
              "transcript",
              "tool-calls",
              "end-of-call-report",
            ],
            server: {
              url: `${url.origin}/api/public/agent/vapi`,
              secret: key,
            },
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
          const detail = error instanceof Error ? error.message : "Web call configuration failed";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
