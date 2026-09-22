# NAGI Vapi browser calling

This branch adds browser calling through `@vapi-ai/web` without requiring a phone number.

## Required server environment

Set these in the deployed NAGI environment:

- `VAPI_PUBLIC_KEY`: Vapi public/client key.
- `NAGI_WEB_VAPI_SECRET`: a new high-entropy secret used to sign 15-minute web-call sessions.

Do not use or expose the permanent per-business NAGI API key in the browser.

## Flow

1. The authenticated NAGI owner opens `/web-call`.
2. NAGI validates the owner's Supabase session and resolves the owner's business.
3. NAGI returns a transient Vapi assistant plus a short-lived signed session token.
4. The Vapi Web SDK starts the browser microphone call.
5. Vapi sends tool calls and call lifecycle events to `/api/public/agent/vapi`.
6. NAGI validates the signed web session, executes the same business tools as the phone agent, and writes the call to `calls`.
7. The owner can review transcript, summary, status, duration, direction, and call ID in `/calls`.

## Before production

Use an ephemeral/session-specific credential mechanism rather than exposing any reusable secret in a client-visible assistant definition. Rotate `NAGI_WEB_VAPI_SECRET` if it is ever exposed.
