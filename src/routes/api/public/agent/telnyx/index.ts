import { createFileRoute } from "@tanstack/react-router";

import { allowAgentRequest, callerIdentity, tooManyRequests } from "@/lib/agent-rate-limit.server";
import {
  AgentError,
  contextForApiKey,
  defaultVoiceGreeting,
  ensureStaffFollowup,
  saveCallLog,
  toolDeclarations,
  voiceSystemPrompt,
} from "@/lib/nagi-agent.server";
import { parseTelnyxEvent, telnyxKeyFrom } from "@/lib/telnyx-protocol";

/**
 * Telnyx integration for one business (auth: that business's NAGI API key).
 *  GET  -> assistant setup: greeting, NAGI system prompt and tool list/URLs to paste into Telnyx.
 *  POST -> Telnyx call events (call.initiated / call.hangup / conversation ended) -> call history.
 */
export const Route = createFileRoute("/api/public/agent/telnyx/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const key = telnyxKeyFrom(request, url);
          if (!allowAgentRequest(callerIdentity(request, key))) return tooManyRequests();
          const ctx = await contextForApiKey(key);
          return Response.json({
            ok: true,
            greeting: defaultVoiceGreeting(ctx.business.name, ctx.greeting),
            instructions: await voiceSystemPrompt(ctx),
            events_url: url.origin + "/api/public/agent/telnyx",
            tools: toolDeclarations().map((t) => ({
              ...t,
              url: url.origin + "/api/public/agent/telnyx/" + t.name,
              method: "POST",
            })),
          });
        } catch (error) {
          const status = error instanceof AgentError ? error.status : 500;
          return Response.json({ ok: false, error: "Unauthorized or unavailable" }, { status });
        }
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const key = telnyxKeyFrom(request, url);
          if (!allowAgentRequest(callerIdentity(request, key))) return tooManyRequests();
          const ctx = await contextForApiKey(key);
          const event = parseTelnyxEvent(await request.json().catch(() => null));
          if (!event) return Response.json({ ok: true, ignored: true });

          const ended = /hangup|ended|conversation_ended|insights/i.test(event.eventType);
          await saveCallLog(ctx, event.callId, {
            transcript: event.transcript,
            status: ended ? "completed" : "in_progress",
            from_number: event.from,
            to_number: event.to,
            duration_seconds: event.durationSeconds,
            channel: "voice",
            direction: "inbound",
          });
          if (ended) await ensureStaffFollowup(ctx, event.callId, event.transcript || null, event.from);
          return Response.json({ ok: true });
        } catch (error) {
          const status = error instanceof AgentError ? error.status : 500;
          console.error("[nagi-telnyx] event failed", error instanceof Error ? error.message : "");
          return Response.json({ ok: false }, { status });
        }
      },
    },
  },
});
