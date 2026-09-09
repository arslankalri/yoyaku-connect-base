/**
 * Phone channel for NAGI (server-only).
 *
 * Twilio handles the telephony, Lovable AI speech-to-text turns the caller's
 * audio into text, and the reusable NAGI brain produces the reply. Every turn is
 * appended to the same `calls` row (keyed by the Twilio CallSid) so real phone
 * conversations land in the owner's call/chat history exactly like chat sessions.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ModelMessage } from "ai";

import {
  NAGI_TOKENS,
  NagiError,
  createNagiSessionForBusiness,
  generateNagiReply,
  type NagiSession,
} from "@/lib/nagi-brain.server";
import type { AuthedClient } from "@/lib/nagi-data.server";

const STT_MODEL = "google/gemini-3.5-transcribe";
const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

export type VoiceLang = "ja" | "en";

/** Digits-only comparison so +81 3-1234-5678 and +81312345678 match. */
export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function looksJapanese(text: string) {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

async function adminClient(): Promise<AuthedClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AuthedClient;
}

export type VoiceTarget = {
  supabase: AuthedClient;
  business: { id: string; name: string; timezone: string; google_calendar_id: string | null };
  ownerUserId: string;
  greeting: string;
};

/** Find which business owns the dialled Twilio number. */
export async function resolveVoiceTarget(toNumber: string): Promise<VoiceTarget | null> {
  const digits = normalizePhone(toNumber);
  if (!digits) return null;
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("nagi_settings")
    .select("business_id, voice_enabled, voice_phone_number, voice_greeting")
    .eq("voice_enabled", true)
    .not("voice_phone_number", "is", null);
  if (error) throw error;

  const match = (data ?? []).find((row) => normalizePhone(row.voice_phone_number) === digits);
  if (!match) return null;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, owner_id, name, timezone, google_calendar_id")
    .eq("id", match.business_id)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business) return null;

  return {
    supabase,
    business: {
      id: business.id,
      name: business.name,
      timezone: business.timezone,
      google_calendar_id: business.google_calendar_id,
    },
    ownerUserId: business.owner_id,
    greeting: (match.voice_greeting ?? "").trim(),
  };
}

export async function voiceSession(target: VoiceTarget): Promise<NagiSession> {
  return createNagiSessionForBusiness(
    target.supabase,
    target.business,
    target.ownerUserId,
    "voice",
  );
}

/* ------------------------------ call transcript ----------------------------- */

export async function loadTranscript(
  supabase: AuthedClient,
  businessId: string,
  callSid: string,
): Promise<string> {
  const { data } = await supabase
    .from("calls")
    .select("transcript")
    .eq("business_id", businessId)
    .eq("session_key", callSid)
    .maybeSingle();
  return data?.transcript ?? "";
}

export async function saveTranscript(
  supabase: AuthedClient,
  businessId: string,
  callSid: string,
  transcript: string,
  extra: {
    from_number?: string | null;
    to_number?: string | null;
    status?: string;
    duration_seconds?: number | null;
    summary?: string | null;
  } = {},
) {
  const { error } = await supabase.from("calls").upsert(
    {
      business_id: businessId,
      channel: "voice",
      session_key: callSid,
      direction: "inbound",
      status: extra.status ?? "in_progress",
      transcript,
      started_at: new Date().toISOString(),
      ...(extra.from_number !== undefined ? { from_number: extra.from_number } : {}),
      ...(extra.to_number !== undefined ? { to_number: extra.to_number } : {}),
      ...(extra.duration_seconds !== undefined ? { duration_seconds: extra.duration_seconds } : {}),
      ...(extra.summary !== undefined ? { summary: extra.summary } : {}),
    },
    { onConflict: "business_id,session_key" },
  );
  if (error) throw error;
}

/** Rebuild the model conversation from the stored transcript lines. */
export function transcriptToMessages(transcript: string): ModelMessage[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap<ModelMessage>((line) => {
      if (line.startsWith("Customer: ")) return [{ role: "user", content: line.slice(10) }];
      if (line.startsWith("NAGI: ")) return [{ role: "assistant", content: line.slice(6) }];
      return [];
    });
}

export function stripTokens(text: string) {
  let out = text;
  for (const token of Object.values(NAGI_TOKENS)) out = out.replaceAll(token, "");
  return out.replace(/\s+/g, " ").trim();
}

/* --------------------------------- audio ----------------------------------- */

/** Download the Twilio recording through the connector gateway (auth handled there). */
async function fetchRecording(recordingSid: string): Promise<Blob> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!twilioKey) throw new Error("TWILIO_API_KEY is not configured — connect Twilio");

  // Twilio needs a moment before the recording media is retrievable.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${GATEWAY}/Recordings/${recordingSid}.mp3`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
      },
    });
    if (response.ok) return await response.blob();
    if (response.status !== 404) {
      throw new Error(`Twilio recording fetch failed: ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Twilio recording was not available");
}

/** Transcribe the caller's audio with Lovable AI speech-to-text. */
export async function transcribeRecording(recordingSid: string): Promise<string> {
  const audio = await fetchRecording(recordingSid);
  const form = new FormData();
  form.append("model", STT_MODEL);
  form.append("file", audio, "turn.mp3");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/* ---------------------------------- TwiML ---------------------------------- */

function xmlEscape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export function say(text: string, lang: VoiceLang) {
  const voice =
    lang === "ja"
      ? 'language="ja-JP" voice="Polly.Mizuki"'
      : 'language="en-US" voice="Polly.Joanna"';
  return `<Say ${voice}>${xmlEscape(text)}</Say>`;
}

/** Record the caller's next sentence and post it to the turn webhook. */
export function record(origin: string) {
  return `<Record action="${origin}/api/public/voice/turn" method="POST" maxLength="30" timeout="3" playBeep="false" trim="trim-silence" />`;
}

export function sayAndListen(text: string, lang: VoiceLang, origin: string) {
  return twiml(say(text, lang) + record(origin));
}

export function sayAndHangUp(text: string, lang: VoiceLang) {
  return twiml(say(text, lang) + "<Hangup/>");
}

export function defaultGreeting(businessName: string, custom: string) {
  if (custom) return custom;
  return `お電話ありがとうございます。${businessName}のAI受付、ナギです。ご用件をお話しください。`;
}

/* --------------------------- request verification -------------------------- */

/**
 * Verify Twilio's request signature when TWILIO_AUTH_TOKEN is configured.
 * Without the token we cannot verify, so the webhook refuses to act.
 */
export function verifyTwilioSignature(url: string, params: Record<string, string>, header: string) {
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!token) return false;
  const payload =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");
  const expected = createHmac("sha1", token).update(payload).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Run one caller turn through the brain and return the spoken reply. */
export async function nagiVoiceTurn(
  session: NagiSession,
  transcript: string,
  callerText: string,
): Promise<{ reply: string; transcript: string; handoff: boolean }> {
  const history = transcriptToMessages(transcript);
  history.push({ role: "user", content: callerText });
  const raw = await generateNagiReply(session, history);
  const reply = stripTokens(raw) || "申し訳ありません。もう一度お願いできますか。";
  const next = [transcript, `Customer: ${callerText}`, `NAGI: ${reply}`].filter(Boolean).join("\n");
  return { reply, transcript: next, handoff: raw.includes(NAGI_TOKENS.handoff) };
}

export { NagiError };
