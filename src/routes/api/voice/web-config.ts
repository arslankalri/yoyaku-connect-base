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
            .select("voice_enabled, voice_greeting, vapi_assistant_id")
            .eq("business_id", business.id)
            .maybeSingle();

          if (error) throw error;

          // Browser testing does not require a phone number or the inbound
          // phone toggle — voice_enabled only gates real inbound calls.
          const publicKey =
            process.env["VAPI_PUBLIC_KEY"] ??
            process.env["VITE_VAPI_PUBLIC_KEY"] ??
            process.env["VAPI_PUBLIC_API_KEY"];

          if (!publicKey) {
            throw new AgentError(
              503,
              "Setup needed: add your Vapi public API key as VAPI_PUBLIC_KEY in Project Settings → Secrets to use browser voice testing. Never use a private Vapi key.",
            );
          }

          const session = createWebCallToken(business.id);
          const ctx = await contextForBusinessId(supabase, business.id);
          const webhook = {
            // Vapi must reach a public URL: preview/localhost origins are not reachable, so use the live site.
            url: new URL(
              "/api/public/agent/vapi",
              /localhost|127\.0\.0\.1|id-preview--|lovableproject\.com/.test(
                new URL(request.url).host,
              )
                ? "https://yoyaku-connect-base.lovable.app"
                : request.url,
            ).toString(),
            secret: session.token,
          };

          const tools = toolDeclarations().map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
            server: webhook,
          }));
          const serverMessages = [
            "status-update",
            "transcript",
            "tool-calls",
            "end-of-call-report",
          ];
          const metadata = {
            nagiBusinessId: business.id,
            source: "web",
          };

          // When the owner linked their own Vapi assistant, start it by ID and
          // attach NAGI's tools/server as overrides so booking still runs through NAGI.
          const assistantId = settings?.vapi_assistant_id?.trim();
          if (assistantId) {
            return Response.json({
              publicKey,
              assistantId,
              assistantOverrides: {
                model: { tools },
                server: webhook,
                serverMessages,
                metadata,
              },
              expiresAt: session.expiresAt,
            });
          }

          const assistant = {
            name: "NAGI Web — " + business.name,
            firstMessage: defaultVoiceGreeting(business.name, settings?.voice_greeting ?? ""),
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
              tools,
            },
            serverMessages,
            server: webhook,
            metadata,
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

          const detail = error instanceof Error ? error.message : "Unable to configure web calling";
          return Response.json({ error: detail }, { status: 500 });
        }
      },
    },
  },
});
