import { createFileRoute } from "@tanstack/react-router";

import {
  AgentError,
  contextForApiKey,
  defaultVoiceGreeting,
  toolDeclarations,
  voiceSystemPrompt,
} from "@/lib/nagi-agent.server";

function keyFrom(request: Request) {
  const header =
    request.headers.get("x-nagi-api-key") ??
    request.headers.get("authorization") ??
    "";
  return (header.startsWith("Bearer ") ? header.slice(7) : header).trim();
}

export const Route = createFileRoute("/api/public/agent/vapi/web-config")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);

        try {
          const key = keyFrom(request);
          if (!key) throw new AgentError(401, "Missing API key");

          const ctx = await contextForApiKey(key);
          if (!ctx.voiceEnabled) {
            throw new AgentError(409, "NAGI voice calling is turned off");
          }

          const webhook = {
            url: new URL("/api/public/agent/vapi", url).toString(),
            // Prototype path: the owner supplies this business key and Vapi
            // uses it only for the lifetime of this web call configuration.
            secret: key,
          };

          const assistant = {
            name: `NAGI Web — ${ctx.business.name}`,
            firstMessage: defaultVoiceGreeting(ctx.business.name, ctx.greeting),
            firstMessageMode: "assistant-speaks-first",
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "ja",
            },
            voice: {
              provider: "azure",
              voiceId: "ja-JP-NanamiNeural",
            },
            model: {
              provider: "openai",
              model: "gpt-4o",
              temperature: 0.4,
              messages: [
                {
                  role: "system",
                  content: await voiceSystemPrompt(ctx),
                },
              ],
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
              source: "web",
            },
          };

          return Response.json({ assistant });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ error: error.message }, { status: error.status });
          }

          const detail =
            error instanceof Error ? error.message : "Unable to build NAGI web assistant";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
