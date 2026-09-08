import { createFileRoute } from "@tanstack/react-router";

import {
  loadTranscript,
  resolveVoiceTarget,
  saveTranscript,
  verifyTwilioSignature,
} from "@/lib/nagi-voice.server";

/** Twilio posts here when the call ends, so the stored call is marked completed. */
export const Route = createFileRoute("/api/public/voice/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
        const duration = Number.parseInt(params["CallDuration"] ?? "", 10);
        if (!callSid) return new Response("Missing CallSid", { status: 400 });

        const target = await resolveVoiceTarget(to);
        if (!target) return new Response("ok");

        const transcript = await loadTranscript(target.supabase, target.business.id, callSid);
        const firstCustomer = transcript
          .split("\n")
          .find((line) => line.startsWith("Customer: "))
          ?.slice(10)
          .slice(0, 200);

        await saveTranscript(target.supabase, target.business.id, callSid, transcript, {
          status: "completed",
          duration_seconds: Number.isFinite(duration) ? duration : null,
          summary: firstCustomer ?? null,
        });
        return new Response("ok");
      },
    },
  },
});
