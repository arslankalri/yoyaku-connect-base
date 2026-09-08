import { createFileRoute } from "@tanstack/react-router";

import {
  looksJapanese,
  nagiVoiceTurn,
  resolveVoiceTarget,
  loadTranscript,
  sayAndHangUp,
  sayAndListen,
  saveTranscript,
  transcribeRecording,
  verifyTwilioSignature,
  voiceSession,
} from "@/lib/nagi-voice.server";

/** Twilio posts each recorded caller turn here; NAGI answers and keeps listening. */
export const Route = createFileRoute("/api/public/voice/turn")({
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
        const recordingSid = params["RecordingSid"] ?? "";
        if (!callSid) return new Response("Missing CallSid", { status: 400 });

        const target = await resolveVoiceTarget(to);
        if (!target) {
          return sayAndHangUp("申し訳ありません。ただ今お受けできません。", "ja");
        }

        const transcript = await loadTranscript(target.supabase, target.business.id, callSid);

        let callerText = "";
        try {
          if (recordingSid) callerText = await transcribeRecording(recordingSid);
        } catch (error) {
          console.error("[nagi-voice] transcription failed", error);
        }

        if (!callerText) {
          // Nothing intelligible — politely ask again and keep the line open.
          const retry = "申し訳ありません。もう一度お願いできますか。";
          return sayAndListen(retry, "ja", url.origin);
        }

        try {
          const session = await voiceSession(target);
          const turn = await nagiVoiceTurn(session, transcript, callerText);
          await saveTranscript(
            target.supabase,
            target.business.id,
            callSid,
            turn.transcript,
            { status: "in_progress" },
          );
          const lang = looksJapanese(turn.reply) ? "ja" : "en";
          return turn.handoff
            ? sayAndHangUp(turn.reply, lang)
            : sayAndListen(turn.reply, lang, url.origin);
        } catch (error) {
          console.error("[nagi-voice] turn failed", error);
          await saveTranscript(
            target.supabase,
            target.business.id,
            callSid,
            [transcript, `Customer: ${callerText}`].filter(Boolean).join("\n"),
            { status: "in_progress" },
          );
          return sayAndHangUp(
            "申し訳ありません。ただ今お受けできません。担当者より折り返しご連絡いたします。",
            "ja",
          );
        }
      },
    },
  },
});
