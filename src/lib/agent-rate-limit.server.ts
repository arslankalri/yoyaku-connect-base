/**
 * Lightweight in-memory rate limit for the external agent boundary
 * (public agent API + Vapi webhook). Deliberately simple: a fixed window per
 * caller identity, generous enough that a real phone conversation never trips it.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 180;

/** Returns false when the caller has exceeded its budget for the current window. */
export function allowAgentRequest(identity: string, max = MAX_PER_WINDOW): boolean {
  const now = Date.now();
  const key = identity || "anonymous";
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 5_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= max;
}

/** Stable, non-secret caller identity: a hash-free short fingerprint of the key, else the client IP. */
export function callerIdentity(request: Request, apiKey: string) {
  if (apiKey) return `k:${apiKey.slice(-12)}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `ip:${ip}`;
}

export function tooManyRequests() {
  return Response.json(
    { ok: false, error: "Too many requests" },
    { status: 429, headers: { "Retry-After": "30" } },
  );
}
