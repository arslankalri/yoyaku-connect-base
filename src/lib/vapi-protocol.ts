/**
 * Pure helpers for the Vapi server-URL protocol.
 *
 * Kept free of server-only imports so they can be unit tested directly.
 * Vapi has shipped several payload shapes for tool calls over time and the
 * shape differs between `toolCallList` and `toolCalls`; we accept all of them
 * instead of guessing one.
 */

export type VapiToolCall = { id: string; name: string; arguments: unknown };

type RawToolCall = {
  id?: string;
  toolCallId?: string;
  name?: string;
  arguments?: unknown;
  parameters?: unknown;
  function?: { name?: string; arguments?: unknown; parameters?: unknown };
};

/** Parse tool arguments, which Vapi sends either as an object or a JSON string. */
export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

/** Normalise every known Vapi tool-call payload shape into {id, name, arguments}. */
export function extractToolCalls(message: unknown): VapiToolCall[] {
  const msg = (message ?? {}) as Record<string, unknown>;
  const lists = [msg["toolCallList"], msg["toolCalls"], msg["toolWithToolCallList"]];
  const raw: RawToolCall[] = [];
  for (const list of lists) {
    if (Array.isArray(list)) raw.push(...(list as RawToolCall[]));
  }
  // Legacy single function call payload.
  const legacy = msg["functionCall"] as RawToolCall["function"] | undefined;
  if (legacy?.name) raw.push({ id: String(msg["id"] ?? ""), function: legacy });

  const seen = new Set<string>();
  const calls: VapiToolCall[] = [];
  for (const entry of raw) {
    const nested = entry.function ?? {};
    // `toolWithToolCallList` nests the actual call under `toolCall`.
    const inner = (entry as { toolCall?: RawToolCall }).toolCall;
    const source = inner ?? entry;
    const innerNested = source.function ?? nested;
    const name = String(source.name ?? innerNested.name ?? "").trim();
    if (!name) continue;
    const id = String(source.id ?? source.toolCallId ?? entry.id ?? "");
    const key = `${id}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    calls.push({
      id,
      name,
      arguments: parseToolArguments(
        source.arguments ?? innerNested.arguments ?? source.parameters ?? innerNested.parameters,
      ),
    });
  }
  return calls;
}

const SENSITIVE = /(secret|token|api[_-]?key|password|authorization)/i;

/** Tool parameters, safe to log: secrets removed, long strings clipped. */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  if (typeof value !== "object" || depth > 3) return value;
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => sanitizeForLog(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : sanitizeForLog(v, depth + 1);
  }
  return out;
}

const SCHEMA_KEYS_TO_DROP = new Set(["$schema", "$id", "$defs", "definitions", "additionalProperties"]);

/**
 * Vapi validates tool `parameters` against the OpenAI JSON-Schema subset and
 * rejects the whole assistant when it sees meta keys such as `$schema`.
 */
export function sanitizeToolSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  if (Array.isArray(schema)) return { type: "object", properties: {} };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (SCHEMA_KEYS_TO_DROP.has(key)) continue;
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const props: Record<string, unknown> = {};
      for (const [prop, propSchema] of Object.entries(value as Record<string, unknown>)) {
        props[prop] = sanitizeToolSchema(propSchema);
      }
      out[key] = props;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeToolSchema(value);
    } else {
      out[key] = value;
    }
  }
  if (!out["type"]) out["type"] = "object";
  if (out["type"] === "object" && !out["properties"]) out["properties"] = {};
  return out;
}
