# Telnyx-Only Voice Migration Plan

## Goal
Replace Vapi as NAGI's voice provider. Keep NAGI's existing business brain, booking authority, Supabase data, tenant scoping, and web-call test workflow. First validate a Telnyx-powered browser conversation; only after that passes, test telephony using one personal Telnyx number.

## Current repository findings
- The browser test UI is `src/components/nagi-web-call.tsx`.
- The authenticated browser test route is `src/routes/_authenticated/web-call.tsx`.
- `src/routes/api/voice/web-config.ts` currently builds a Vapi configuration and requires Vapi public-key / assistant configuration.
- `src/lib/vapi-web.ts` wraps `@vapi-ai/web`.
- `src/routes/api/public/agent/vapi.ts` adapts Vapi webhook/tool events into NAGI's shared agent functions.
- Telnyx tool/event adapters already exist in `src/lib/telnyx-protocol.ts` and `src/routes/api/public/agent/telnyx/`.
- `src/lib/nagi-agent.server.ts` is the shared booking/business-logic authority and should remain provider-neutral.

## Proposed staged implementation

### Stage 1 — Telnyx browser voice proof of concept
1. Use Telnyx's documented browser/WebSocket AI Assistant capability (no PSTN number required) or the official Telnyx WebRTC SDK, depending on the selected Telnyx product/configuration.
2. Add a server-only configuration endpoint that authenticates the signed-in NAGI user, resolves their business, and returns only non-secret configuration.
3. Add a provider-neutral web-call interface so the existing page can switch to the Telnyx client without putting Telnyx API secrets in the browser.
4. Route tool calls through NAGI's existing authenticated, tenant-scoped server functions. Never let a browser-supplied business ID determine tenant authority.
5. Test microphone permission, two-way audio, connect/disconnect, Japanese conversation, business/service answers, availability, booking, and persisted call logs.
6. Keep the Vapi implementation available for rollback until the Telnyx browser test passes.

### Stage 2 — Personal phone-number test
1. Configure Telnyx telephony after Stage 1 is verified.
2. Buy or assign one number only for the owner's test, if needed for the chosen call path.
3. Test inbound and outbound calls, call routing, Japanese audio, tool execution, call events, and logs.
4. Confirm fallback and failure behavior.

### Stage 3 — Remove Vapi
Only after both test stages pass:
- Remove Vapi-specific UI/client/config and unused dependencies.
- Remove Vapi webhook/session code only after confirming there are no remaining callers.
- Remove Vapi secrets from deployment settings separately.
- Run format/lint/build/tests and inspect the complete diff.
- Merge only through a reviewed pull request.

## External setup required before implementing the browser client
The repo does not establish that a Telnyx AI Assistant is already configured. Before finalizing the browser adapter, confirm which Telnyx path will be used:
- Telnyx AI Assistant direct WebSocket conversation (no PSTN number), or
- Telnyx WebRTC Voice SDK authenticated with a SIP connection/JWT and an AI Assistant call flow.

Do not expose Telnyx API keys, SIP passwords, or long-lived credentials in client code. Use server-side secrets and short-lived/restricted credentials where supported.

## Acceptance criteria
- Browser call starts/stops reliably and reports actionable errors.
- No Vapi request is required for the Telnyx test path.
- Booking and business data access still run through NAGI's existing tenant-scoped server functions.
- No false booking-success messages when tools fail.
- Test call records and transcripts are stored correctly.
- No production/main branch changes until acceptance criteria pass.
