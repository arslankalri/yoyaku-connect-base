import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { createUserClient, getBusinessForUser } from "@/lib/nagi-data.server";
import {
  AgentError,
  contextForBusinessId,
  defaultVoiceGreeting,
  toolDeclarations,
  voiceSystemPrompt,
} from "@/lib/nagi-agent.server";
import { createWebCallToken } from "@/lib/vapi-web-session.server";

async function authenticatedAccessToken(request: Request) {
  const auth = request.headers.get("Authorization") ?? "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!accessToken) throw new AgentError(401, "Not authenticated");

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new AgentError(500, "Supabase server environment is not configured");
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: key,
        Authorization: "Bearer " + accessToken,
      },
    },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new AgentError(401, "Not authenticated");
  return accessToken;
}

export const Route = createFileRoute("/api/voice/web-config")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const accessToken = await authenticatedAccessToken(request);
          const supabase = createUserClient(accessToken);
          const business = await getBusinessForUser(supabase);
          if (!business) throw new AgentError(404, "No business found");

          const { data: settings, error } = await supabase
            .from("nagi_settings")
            .select("voice_enabled, voice_greeting")
            .eq("business_id", business.id)
            .maybeSingle();

          if (error) throw error;
          if (!settings?.voice_enabled) {
            throw new AgentError(409, "NAGI voice calling is turned off");
          }

          const publicKey =
            process.env["VAPI_PUBLIC_KEY"] ??
            process.env["VITE_VAPI_PUBLIC_KEY"] ??
            process.env["VAPI_PUBLIC_API_KEY"];

          if (!publicKey) {
            throw new AgentError(500, "Vapi public key is not configured");
          }

          const session = createWebCallToken(business.id);
          const ctx = await contextForBusinessId(supabase, business.id);
          const webhook = {
            url: new URL("/api/public/agent/vapi", request.url).toString(),
            secret: session.token,
          };

          const assistant = {
            name: "NAGI Web — " + business.name,
            firstMessage: defaultVoiceGreeting(
              business.name,
              settings.voice_greeting ?? "",
            ),
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
              nagiBusinessId: business.id,
              source: "web",
            },
          };

          return Response.json({
            publicKey,
            assistant,
            expiresAt: session.expiresAt,
          });
        } catch (error) {
          if (error instanceof AgentError) {
            return Response.json({ error: error.message }, { status: error.status });
          }

          const detail =
            error instanceof Error ? error.message : "Unable to configure web calling";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
