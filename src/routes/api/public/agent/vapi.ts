import { createFileRoute } from "@tanstack/react-router";

import { allowAgentRequest, callerIdentity, tooManyRequests } from "@/lib/agent-rate-limit.server";
import { extractToolCalls, sanitizeForLog } from "@/lib/vapi-protocol";

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
  if (key) return contextForApiKey(key);
  const dialled = message.phoneNumber?.number ?? message.call?.phoneNumber?.number ?? "";
  const byPhone = dialled ? await contextForPhoneNumber(dialled) : null;
  if (!byPhone) throw new AgentError(401, "Missing or invalid API key");
  return byPhone;
}

/** Structured, secret-free server log for every Vapi interaction. */
function log(event: string, fields: Record<string, unknown>) {
  console.log(`[nagi-vapi] ${event}`, JSON.stringify(sanitizeForLog(fields)));
}

function transcriptOf(message: VapiMessage) {
  return message.artifact?.transcript ?? message.transcript ?? "";
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
          // Vapi normally wraps the event in `message`; accept a top-level event too.
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

          // Every event that carries a call id gets a call-history row, so the
          // owner sees the call even when Vapi uses a statically configured
          // assistant and never sends us `assistant-request`.
          if (callId && eventType !== "assistant-request") {
            await saveCallLog(ctx, callId, {
              transcript: transcriptOf(message),
              from_number: caller,
              to_number: dialled,
            }).catch((error) => log("call_log_failed", { call_id: callId, error: String(error) }));
          }

          switch (eventType) {
            case "assistant-request": {
              if (!ctx.voiceEnabled) {
                log("assistant_request_disabled", {
                  call_id: callId,
                  business_id: ctx.business.id,
                });
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
              log("assistant_sent", {
                call_id: callId,
                business_id: ctx.business.id,
                tools: assistant.model.tools.length,
              });
              return Response.json({ assistant });
            }

            case "tool-calls":
            case "function-call": {
              const calls = extractToolCalls(message);
              if (calls.length === 0) {
                log("tool_calls_empty", { call_id: callId, business_id: ctx.business.id });
                return Response.json({ results: [] });
              }
              const results: Array<{ toolCallId: string; result?: string; error?: string }> = [];
              for (const call of calls) {
                const args = { ...(call.arguments as Record<string, unknown>) };
                if (callId && !args["call_id"]) args["call_id"] = callId;
                if (caller && !args["caller_phone"]) args["caller_phone"] = caller;
                log("tool_call", {
                  call_id: callId,
                  business_id: ctx.business.id,
                  tool: call.name,
                  tool_call_id: call.id,
                  params: args,
                });
                try {
                  const result = await runAgentTool(ctx, call.name, args);
                  log("tool_result", {
                    call_id: callId,
                    business_id: ctx.business.id,
                    tool: call.name,
                    tool_call_id: call.id,
                    result,
                  });
                  results.push({ toolCallId: call.id, result: JSON.stringify(result) });
                } catch (error) {
                  const detail =
                    error instanceof AgentError
                      ? error.message
                      : error instanceof Error
                        ? error.message
                        : "Tool failed";
                  log("tool_failed", {
                    call_id: callId,
                    business_id: ctx.business.id,
                    tool: call.name,
                    tool_call_id: call.id,
                    reason: detail,
                  });
                  // Report the failure to Vapi as a normal tool result so the
                  // assistant can say it truthfully — never as a success.
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
                  duration_seconds: message.durationSeconds
                    ? Math.round(message.durationSeconds)
                    : null,
                });
                log("call_completed", {
                  call_id: callId,
                  business_id: ctx.business.id,
                  duration_seconds: message.durationSeconds ?? null,
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
