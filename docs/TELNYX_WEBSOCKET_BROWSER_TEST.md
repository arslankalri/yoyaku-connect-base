# Telnyx WebSocket Browser Test — Implementation Notes

## Scope for this phase
Build and verify a Telnyx AI Assistant browser conversation over WebSocket only. Do not purchase or configure a phone number. Do not change inbound/outbound PSTN call handling. Keep the current Vapi web-call path available until Telnyx passes acceptance tests.

## Official Telnyx behavior verified
Telnyx's August 3, 2026 release note documents:
- WebSocket endpoint: wss://api.telnyx.com/v2/ai/assistants/{assistant_id}/conversation
- No phone number or PSTN connection required.
- Client streams base64-encoded PCM16 audio frames and receives assistant audio, transcription, and lifecycle events.
- Input/output sample rates are supplied as query parameters.
- The direct example authenticates with a Telnyx API v2 key in an Authorization Bearer header.

Reference: https://telnyx.com/release-notes/voice-ai-websocket-conversations

## Security requirement
Never put a Telnyx API v2 key in client-side JavaScript, a VITE_ variable, a response payload, or browser storage. The documented direct WebSocket example requires a bearer key, so connecting directly from the browser would expose that private key.

Before shipping this path, establish a safe authentication/transport design:
1. Prefer a server-side WebSocket proxy that keeps the Telnyx key in server environment secrets and forwards only the required conversation frames/events.
2. Confirm that the current deployment platform supports WebSocket upgrade/proxying for the required lifetime and audio throughput. The existing HTTP TanStack Start route pattern alone does not establish WebSocket support.
3. If the current host cannot support a durable WebSocket proxy, use a separately deployed, secured WebSocket gateway or choose a Telnyx-supported browser credential mechanism if Telnyx confirms one is available for this endpoint. Do not invent a client token flow.
4. Authenticate the NAGI user before issuing a test session; resolve the business server-side; never trust a browser-supplied business ID as tenant authority.
5. Restrict the test to the authenticated user's business assistant and apply rate limits, session expiry, maximum duration, and safe error handling.

## Existing repository components to preserve
- UI: src/components/nagi-web-call.tsx
- Authenticated test page: src/routes/_authenticated/web-call.tsx
- Current Vapi configuration endpoint: src/routes/api/voice/web-config.ts
- Current Vapi client wrapper: src/lib/vapi-web.ts
- Shared NAGI business/booking logic: src/lib/nagi-agent.server.ts
- Existing Telnyx tool/event adapter: src/lib/telnyx-protocol.ts
- Existing Telnyx tool and event routes: src/routes/api/public/agent/telnyx/

## Implementation order
1. Verify the intended Telnyx Assistant ID and confirm an assistant is configured in Mission Control with a voice, transcription, model/instructions, and tools.
2. Choose and validate the secure WebSocket gateway architecture and hosting capability.
3. Add a provider-neutral browser-call client contract and a Telnyx WebSocket client that captures microphone audio, converts it to PCM16 at the negotiated sample rate, sends audio frames, decodes/plays assistant audio, and handles transcript/lifecycle/error events.
4. Route booking/business tools through NAGI's existing tenant-scoped server functions. Do not move booking authority into browser code.
5. Add tests for audio frame encoding/decoding helpers and event parsing.
6. Verify microphone permissions, connect/disconnect, Japanese speech in both directions, interruption/stop behavior, service Q&A, availability, and booking persistence.
7. Keep Vapi available for rollback until all acceptance tests pass. Only then plan its removal.

## Acceptance criteria
- The browser test uses Telnyx for the conversation and does not call Vapi.
- No private Telnyx credential is exposed to the browser.
- Audio works in both directions and the connection closes cleanly.
- Japanese speech, transcript events, and useful connection errors work.
- Business lookups and booking run through NAGI's server-side tenant-scoped functions.
- No phone number or PSTN setup is required for this phase.
- No changes are merged to main before review and tests.

## Status
This document records the implementation constraints and plan. It does not claim the WebSocket client or proxy has been implemented or tested yet.
