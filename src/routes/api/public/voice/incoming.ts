import { createFileRoute } from "@tanstack/react-router";

import {
  defaultGreeting,
  looksJapanese,
  resolveVoiceTarget,
  sayAndHangUp,
  sayAndListen,
  saveTranscript,
  verifyTwilioSignature,
} from "@/lib/nagi-voice.server";

/** Twilio posts here when a customer calls the business's NAGI number. */
export const Route = createFileRoute("/api/public/voice/incoming")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const form = await request.formData();
        const params = Object.fromEntries(
          [...form.entries()].map(([k, v]) => [k, String(v)]),
        ) as Record<string, string>;

        if (
          !verifyTwilioSignature(
            request.url,
            params,
            request.headers.get("x-twilio-signature") ?? "",
          )
        ) {
          return new Response("Invalid signature", { status: 401 });
        }

        const callSid = params["CallSid"] ?? "";
        const to = params["To"] ?? "";
        const from = params["From"] ?? "";
        if (!callSid) return new Response("Missing CallSid", { status: 400 });

        const target = await resolveVoiceTarget(to);
        if (!target) {
          return sayAndHangUp(
            "申し訳ありません。この番号は現在ご利用いただけません。",
            "ja",
          );
        }

        const greeting = defaultGreeting(target.business.name, target.greeting);
        await saveTranscript(target.supabase, target.business.id, callSid, `NAGI: ${greeting}`, {
          from_number: from || null,
          to_number: to || null,
          status: "in_progress",
        });

        return sayAndListen(greeting, looksJapanese(greeting) ? "ja" : "en", url.origin);
      },
    },
  },
});
