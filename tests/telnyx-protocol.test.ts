import { describe, expect, test } from "bun:test";
import { parseTelnyxEvent, telnyxKeyFrom, telnyxToolArgs } from "../src/lib/telnyx-protocol";

describe("telnyx protocol", () => {
  test("reads bearer key", () => {
    const r = new Request("https://x/a", { headers: { authorization: "Bearer nagi_sk_1" } });
    expect(telnyxKeyFrom(r, new URL(r.url))).toBe("nagi_sk_1");
  });
  test("unwraps stringified arguments", () => {
    expect(telnyxToolArgs({ arguments: '{"date":"2026-11-01"}' })).toEqual({ date: "2026-11-01" });
    expect(telnyxToolArgs({ date: "x" })).toEqual({ date: "x" });
  });
  test("parses hangup into prefixed call id with duration", () => {
    const e = parseTelnyxEvent({
      data: {
        event_type: "call.hangup",
        payload: { call_session_id: "abc", from: "+81", to: "+1", start_time: "2026-01-01T00:00:00Z", end_time: "2026-01-01T00:01:30Z" },
      },
    });
    expect(e?.callId).toBe("telnyx_abc");
    expect(e?.durationSeconds).toBe(90);
  });
  test("ignores payload without call id", () => {
    expect(parseTelnyxEvent({ data: { event_type: "call.hangup", payload: {} } })).toBeNull();
  });
});
