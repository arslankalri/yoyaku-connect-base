import { createHmac, randomUUID } from "node:crypto";

export type WebCallSession = {
  businessId: string;
  token: string;
  expiresAt: number;
};

const TTL_SECONDS = 15 * 60;

function secret() {
  const value = process.env["NAGI_WEB_VAPI_SECRET"];
  if (!value) throw new Error("NAGI_WEB_VAPI_SECRET is not configured");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createWebCallToken(businessId: string): WebCallSession {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const nonce = randomUUID();
  const payload = encode(JSON.stringify({ businessId, expiresAt, nonce }));
  const token = `web_${payload}.${sign(payload)}`;
  return { businessId, token, expiresAt };
}

export function parseWebCallToken(token: string) {
  if (!token.startsWith("web_")) return null;
  const value = token.slice(4);
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature !== expected) return null;

  let parsed: { businessId?: string; expiresAt?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      businessId?: string;
      expiresAt?: number;
    };
  } catch {
    return null;
  }

  if (!parsed.businessId || !parsed.expiresAt) return null;
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return {
    businessId: parsed.businessId,
    expiresAt: parsed.expiresAt,
  };
}
