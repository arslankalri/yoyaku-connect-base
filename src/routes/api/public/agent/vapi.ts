import { createFileRoute } from "@tanstack/react-router";

import { allowAgentRequest, callerIdentity, tooManyRequests } from "@/lib/agent-rate-limit.server";
import { extractToolCalls, sanitizeForLog } from "@/lib/vapi-protocol";
import { parseWebCallToken } from "@/lib/vapi-web-session.server";

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

type VapiMessage = {
  type?: string;
  call?: {
    id?: string;
    customer?: { number?: string };
    phoneNumber?: { number?: string };
    phoneNumberId?: string;
  };
  phoneNumber?: { number?: string };
  customer?: { number?: string };
  toolCalls?: unknown;
  toolCallList?: unknown;
  status?: string;
  endedReason?: string;
  durationSeconds?: number;
  summary?: string;
  transcript?: string;
  artifact?: { transcript?: string; messages?: unknown };
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

  if (key.startsWith("web_")) {
    const session = parseWebCallToken(key);
    if (!session) throw new AgentError(401, "Expired or invalid web call session");
    const { contextForBusinessId } = await import("@/lib/nagi-agent.server");
    const adminModule = await import("@/integrations/supabase/client.server");
    const supabase = adminModule.supabaseAdmin as never;
    return contextForBusinessId(supabase, session.businessId);
  }

  if (key) return contextForApiKey(key);

  const dialled = message.phoneNumber?.number ?? message.call?.phoneNumber?.number ?? "";
  const byPhone = dialled ? await contextForPhoneNumber(dialled) : null;
  if (!byPhone) throw new AgentError(401, "Missing or invalid API key");
  return byPhone;
}

function log(event: string, fields: Record<string, unknown>) {
  console.log("[nagi-vapi] " + event, JSON.stringify(sanitizeForLog(fields)));
}

function transcriptOf(message: VapiMessage) {
  return message.artifact?.transcript ?? message.transcript ?? "";
}

async function assistantConfig(ctx: AgentContext, origin: string, key: string) {
  const system = await voiceSystemPrompt(ctx);
  const greeting = defaultVoiceGreeting(ctx.business.name, ctx.greeting);
  const server = {
    url: origin + "/api/public/agent/vapi",
    ...(key ? { secret: key } : {}),
  };

  return {
    name: "NAGI — " + ctx.business.name,
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
    serverMessages: ["tool-calls", "status-update", "transcript", "end-of-call-report"],
    server,
  };
}

export const Route = createFileRoute("/api/public/agent/vapi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);

        if (!allowAgentRequest(callerIdentity(request, keyFrom(request, url)))) {
          return tooManyRequests();
        }

        let eventType = "unknown";
        let callId = "";

        try {
          const raw = (await request.json().catch(() => ({}))) as {
            message?: VapiMessage;
          } & VapiMessage;
          const message: VapiMessage = raw.message ?? raw ?? {};

          eventType = message.type ?? "unknown";
          callId = message.call?.id ?? "";

          const caller = message.customer?.number ?? message.call?.customer?.number ?? null;
          const dialled = message.phoneNumber?.number ?? message.call?.phoneNumber?.number ?? null;

          const ctx = await resolveContext(request, url, message);

          log("event", {
            type: eventType,
            call_id: callId,
            business_id: ctx.business.id,
            voice_enabled: ctx.voiceEnabled,
          });

          if (callId && eventType !== "assistant-request") {
            await saveCallLog(ctx, callId, {
              transcript: transcriptOf(message),
              from_number: caller,
              to_number: dialled,
            }).catch((error) =>
              log("call_log_failed", { call_id: callId, error: String(error) }),
            );
          }

          switch (eventType) {
            case "assistant-request": {
              if (!ctx.voiceEnabled) {
                return Response.json({
                  error: "Phone reception is turned off for this business.",
                });
              }
              const assistant = await assistantConfig(ctx, url.origin, keyFrom(request, url));
              if (callId) {
                await saveCallLog(ctx, callId, {
                  status: "in_progress",
                  from_number: caller,
                  to_number: dialled,
                });
              }
              return Response.json({ assistant });
            }

            case "tool-calls":
            case "function-call": {
              const calls = extractToolCalls(message);
              if (calls.length === 0) return Response.json({ results: [] });

              const results: Array<{ toolCallId: string; result?: string; error?: string }> = [];

              for (const call of calls) {
                const args = { ...(call.arguments as Record<string, unknown>) };
                if (callId && !args["call_id"]) args["call_id"] = callId;
                if (caller && !args["caller_phone"]) args["caller_phone"] = caller;

                try {
                  const result = await runAgentTool(ctx, call.name, args);
                  results.push({ toolCallId: call.id, result: JSON.stringify(result) });
                } catch (error) {
                  const detail =
                    error instanceof AgentError
                      ? error.message
                      : error instanceof Error
                        ? error.message
                        : "Tool failed";
                  results.push({
                    toolCallId: call.id,
                    result: JSON.stringify({ ok: false, error: detail }),
                    error: detail,
                  });
                }
              }

              return Response.json({ results });
            }

            case "status-update": {
              if (callId) {
                await saveCallLog(ctx, callId, {
                  transcript: transcriptOf(message),
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
                  transcript: transcriptOf(message),
                  summary: message.summary ?? null,
                  status: "completed",
                  from_number: caller,
                  to_number: dialled,
                  duration_seconds:
                    message.durationSeconds !== undefined
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
            log("rejected", { type: eventType, call_id: callId, reason: error.message });
            return Response.json({ error: error.message }, { status: error.status });
          }

          const detail = error instanceof Error ? error.message : "Webhook failed";
          log("failed", { type: eventType, call_id: callId, reason: detail });
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
