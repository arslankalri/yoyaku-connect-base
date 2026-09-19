import { createFileRoute } from "@tanstack/react-router";

import {
  allowAgentRequest,
  callerIdentity,
  tooManyRequests,
} from "@/lib/agent-rate-limit.server";

import {
  AgentError,
  contextForApiKey,
  contextForPhoneNumber,
  defaultVoiceGreeting,
  runAgentTool,
  saveCallLog,
  toolDeclarations,
  voiceSystemPrompt,
  type AgentContext,
} from "@/lib/nagi-agent.server";

/**
 * Vapi webhook for the NAGI phone receptionist.
 *
 * Vapi owns the telephony, speech-to-text and text-to-speech; NAGI owns the
 * receptionist behaviour. On an inbound call Vapi asks us for the assistant
 * (`assistant-request`) and we answer with the exact same instructions and tools
 * the in-app chat brain uses. Tool calls run against the business's real data and
 * every call is written to the owner's call history.
 */

type VapiMessage = {
  type?: string;
  call?: { id?: string; customer?: { number?: string }; phoneNumber?: { number?: string } };
  phoneNumber?: { number?: string };
  customer?: { number?: string };
  toolCalls?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
  toolCallList?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
  status?: string;
  endedReason?: string;
  durationSeconds?: number;
  summary?: string;
  transcript?: string;
  artifact?: { transcript?: string };
};

function keyFrom(request: Request, url: URL) {
  const header =
    request.headers.get("x-vapi-secret") ??
    request.headers.get("x-nagi-api-key") ??
    request.headers.get("authorization") ??
    "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return (token || url.searchParams.get("key") || "").trim();
}

async function resolveContext(
  request: Request,
  url: URL,
  message: VapiMessage,
): Promise<AgentContext> {
  const key = keyFrom(request, url);
  if (key) return contextForApiKey(key);
  const dialled = message.phoneNumber?.number ?? message.call?.phoneNumber?.number ?? "";
  const byPhone = dialled ? await contextForPhoneNumber(dialled) : null;
  if (!byPhone) throw new AgentError(401, "Missing or invalid API key");
  return byPhone;
}

function parseArgs(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

async function assistantConfig(ctx: AgentContext, origin: string, key: string) {
  const system = await voiceSystemPrompt(ctx);
  const greeting = defaultVoiceGreeting(ctx.business.name, ctx.greeting);
  const server = {
    url: `${origin}/api/public/agent/vapi`,
    ...(key ? { secret: key } : {}),
  };
  return {
    name: `NAGI — ${ctx.business.name}`,
    firstMessage: greeting,
    firstMessageMode: "assistant-speaks-first",
    transcriber: { provider: "deepgram", model: "nova-2", language: "ja" },
    voice: { provider: "azure", voiceId: "ja-JP-NanamiNeural" },
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.4,
      messages: [{ role: "system", content: system }],
      tools: toolDeclarations().map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
        server,
      })),
    },
    serverMessages: ["tool-calls", "status-update", "end-of-call-report"],
    server,
  };
}

export const Route = createFileRoute("/api/public/agent/vapi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const body = (await request.json().catch(() => ({}))) as { message?: VapiMessage };
          const message = body.message ?? {};
          const ctx = await resolveContext(request, url, message);
          const callId = message.call?.id ?? "";
          const caller = message.customer?.number ?? message.call?.customer?.number ?? null;
          const dialled = message.phoneNumber?.number ?? message.call?.phoneNumber?.number ?? null;

          switch (message.type) {
            case "assistant-request": {
              if (!ctx.voiceEnabled) {
                return Response.json({
                  error: "Phone reception is turned off for this business.",
                });
              }
              const assistant = await assistantConfig(ctx, url.origin, keyFrom(request, url));
              if (callId) {
                await saveCallLog(ctx, callId, {
                  transcript: "",
                  status: "in_progress",
                  from_number: caller,
                  to_number: dialled,
                });
              }
              return Response.json({ assistant });
            }

            case "tool-calls": {
              const calls = message.toolCalls ?? message.toolCallList ?? [];
              const results = [];
              for (const call of calls) {
                const name = call.function?.name ?? "";
                const args = parseArgs(call.function?.arguments) as Record<string, unknown>;
                if (callId && !args["call_id"]) args["call_id"] = callId;
                if (caller && !args["caller_phone"]) args["caller_phone"] = caller;
                try {
                  const result = await runAgentTool(ctx, name, args);
                  results.push({ toolCallId: call.id, result: JSON.stringify(result) });
                } catch (error) {
                  const detail = error instanceof Error ? error.message : "Tool failed";
                  console.error("[nagi-vapi] tool failed", name, error);
                  results.push({ toolCallId: call.id, error: detail });
                }
              }
              return Response.json({ results });
            }

            case "status-update": {
              if (callId) {
                await saveCallLog(ctx, callId, {
                  transcript: message.artifact?.transcript ?? message.transcript ?? "",
                  status: message.status === "ended" ? "completed" : "in_progress",
                  from_number: caller,
                  to_number: dialled,
                });
              }
              return Response.json({ ok: true });
            }

            case "end-of-call-report": {
              if (callId) {
                await saveCallLog(ctx, callId, {
                  transcript: message.artifact?.transcript ?? message.transcript ?? "",
                  summary: message.summary ?? null,
                  status: "completed",
                  from_number: caller,
                  to_number: dialled,
                  duration_seconds: message.durationSeconds
                    ? Math.round(message.durationSeconds)
                    : null,
                });
              }
              return Response.json({ ok: true });
            }

            default:
              return Response.json({ ok: true });
          }
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          console.error("[nagi-vapi] webhook failed", error);
          const detail = error instanceof Error ? error.message : "Webhook failed";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
