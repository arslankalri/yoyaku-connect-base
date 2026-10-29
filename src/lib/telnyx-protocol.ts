/**
 * Telnyx voice adapter helpers (pure, no I/O) — shared by the Telnyx routes and tests.
 * Telnyx AI Assistant "webhook" tools POST the tool arguments as the JSON body;
 * Call Control / TeXML events arrive as { data: { event_type, payload } }.
 */
export function telnyxKeyFrom(request: Request, url: URL) {
  const header =
    request.headers.get("x-nagi-api-key") ?? request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return (token || url.searchParams.get("key") || "").trim();
}

/** Tool args may be sent raw, or wrapped as { arguments } / { args }. */
export function telnyxToolArgs(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  const inner = b["arguments"] ?? b["args"];
  if (typeof inner === "string") {
    try {
      return JSON.parse(inner) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return b;
}

export type TelnyxCallEvent = {
  eventType: string;
  callId: string;
  from: string | null;
  to: string | null;
  durationSeconds: number | null;
  transcript: string;
};

export function parseTelnyxEvent(body: unknown): TelnyxCallEvent | null {
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data !== "object") return null;
  const eventType = String(data["event_type"] ?? "");
  const p = (data["payload"] ?? {}) as Record<string, unknown>;
  const callId = String(p["call_session_id"] ?? p["call_control_id"] ?? p["call_leg_id"] ?? "");
  if (!eventType || !callId) return null;
  const start = Date.parse(String(p["start_time"] ?? ""));
  const end = Date.parse(String(p["end_time"] ?? ""));
  const transcript = Array.isArray(p["messages"])
    ? (p["messages"] as { role?: string; content?: string }[])
        .filter((m) => m?.content)
        .map((m) => (m.role === "user" ? "Customer: " : "AI: ") + m.content)
        .join("\n")
    : String(p["transcript"] ?? "");
  return {
    eventType,
    callId: "telnyx_" + callId,
    from: p["from"] ? String(p["from"]) : null,
    to: p["to"] ? String(p["to"]) : null,
    durationSeconds:
      Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 1000)) : null,
    transcript,
  };
}
