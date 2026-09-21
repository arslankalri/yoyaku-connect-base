import { describe, expect, it } from "vitest";

import {
  extractToolCalls,
  parseToolArguments,
  sanitizeForLog,
  sanitizeToolSchema,
} from "@/lib/vapi-protocol";

describe("extractToolCalls", () => {
  it("reads the toolCallList shape (flat name/arguments)", () => {
    const calls = extractToolCalls({
      type: "tool-calls",
      toolCallList: [
        { id: "call_1", name: "create_appointment", arguments: { date: "2026-10-01" } },
      ],
    });
    expect(calls).toEqual([
      { id: "call_1", name: "create_appointment", arguments: { date: "2026-10-01" } },
    ]);
  });

  it("reads the toolCalls shape with a nested function and JSON string arguments", () => {
    const calls = extractToolCalls({
      toolCalls: [
        { id: "call_2", function: { name: "check_availability", arguments: '{"date":"2026-10-02"}' } },
      ],
    });
    expect(calls[0]).toEqual({
      id: "call_2",
      name: "check_availability",
      arguments: { date: "2026-10-02" },
    });
  });

  it("de-duplicates when Vapi sends both list shapes", () => {
    const calls = extractToolCalls({
      toolCallList: [{ id: "a", name: "get_services", arguments: {} }],
      toolCalls: [{ id: "a", function: { name: "get_services", arguments: {} } }],
    });
    expect(calls).toHaveLength(1);
  });

  it("ignores entries without a tool name", () => {
    expect(extractToolCalls({ toolCallList: [{ id: "x" }] })).toEqual([]);
    expect(extractToolCalls({})).toEqual([]);
  });
});

describe("parseToolArguments", () => {
  it("falls back to an empty object for broken JSON", () => {
    expect(parseToolArguments("{not json")).toEqual({});
    expect(parseToolArguments(undefined)).toEqual({});
  });
});

describe("sanitizeToolSchema", () => {
  it("drops JSON-Schema meta keys Vapi rejects", () => {
    const schema = sanitizeToolSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { date: { type: "string", $schema: "x" } },
      required: ["date"],
    });
    expect(schema["$schema"]).toBeUndefined();
    expect((schema["properties"] as Record<string, unknown>)["date"]).toEqual({ type: "string" });
    expect(schema["required"]).toEqual(["date"]);
  });

  it("always returns an object schema", () => {
    expect(sanitizeToolSchema(null)).toEqual({ type: "object", properties: {} });
  });
});

describe("sanitizeForLog", () => {
  it("redacts secrets and clips long strings", () => {
    const out = sanitizeForLog({ secret: "nagi_sk_123", api_key: "x", note: "a".repeat(200) }) as Record<
      string,
      string
    >;
    expect(out["secret"]).toBe("[redacted]");
    expect(out["api_key"]).toBe("[redacted]");
    expect(out["note"].endsWith("…")).toBe(true);
  });
});
