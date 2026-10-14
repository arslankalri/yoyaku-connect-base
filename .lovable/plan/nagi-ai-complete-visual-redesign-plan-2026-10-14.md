# NAGI AI — complete visual redesign plan

## Scope
Create a premium AI voice-agent SaaS theme across every existing screen: graphite/ink surfaces, restrained teal/electric-cyan accents, clean bilingual typography and polished operational layouts.

**Plan only from this review onward.** The current checkout already contains graphite/teal presentation changes from the preceding work; this plan reviews that baseline rather than claiming it is untouched. No further implementation is authorized by this plan. Any later implementation must preserve all routes, features, validation and behavior. No backend/API/database/schema/secrets/provider changes, feature removal, new demo data or publishing. NAGI AI is the authorized project.

## Source review
Confirmed all existing routes, separate public/onboarding layouts, sidebar/mobile drawer, language provider, realtime bell/data hooks, dark-default OKLCH tokens, separate chat/Web Call and existing scripted landing illustration. History renders transcript/copy/delete but not recording playback. Public and authenticated pages were rendered in the existing checkout without observed page errors or document overflow; that is not proof of booking, authentication settings, calendar, tenant isolation or real voice-call correctness.

## Visual system
- **Palette:** neutral graphite canvas, lifted surfaces, deeper ink sidebar and hairline borders. Teal primary commands, cyan voice activity/focus; distinct accessible success/warning/destructive colors. Avoid an all-blue theme, gradient blobs, decorative orbs and pervasive glass/glow.
- **Typography:** retain Japanese-capable Zen Kaku Gothic New/Noto Sans JP. Consistent fixed-size hierarchy, zero letter spacing, tabular figures; load the declared mono font if used. No viewport-scaled text.
- **Layout:** 4–8px card/control radii; divider-led, unframed page sections. Cards only for repeated records, tools and dialogs—not nested page sections.
- **Controls:** existing shadcn Button/Radix primitives and Lucide icons; tooltips, keyboard focus, labelled status and clear pending/disabled/error treatment.
- **Voice identity:** compact NAGI wordmark/waveform. Real-call animation follows existing reported state; never invent microphone levels, latency, connection or booking success.
- **Mobile:** retain drawer; wrap actions, scroll tab strips locally, stack fields/records, keep dialog actions reachable, preserve every field/action and prevent page overflow. Respect reduced motion and usable touch targets.
- **Theme:** consistent dark premium default via semantic tokens, including portals and native inputs; avoid adding a theme-setting feature; current :root and .dark share the same dark palette.

## Every screen: route-by-route
Authenticated files are under `src/routes/_authenticated/`; others under `src/routes/`. All URLs stay unchanged.

| URL · file | Visual plan | Preserve |
|---|---|---|
| `/` · `index.tsx` | Brand-led immersive cover with relevant locally stored imagery, text directly over the scene, restrained waveform and next-section hint. Restyle industry tabs, existing illustration, steps/features/CTAs/footer; no split card hero. | Language and script progression, industry selection, auth/legal links. Existing illustration stays clearly illustrative; no new simulated live results/demo records. |
| `/auth` · `auth.tsx` | Branded focused account form, balanced fields, clear errors/notices and legal links. | Login/signup, name field, validation, busy guard, email-confirmation notice, safe `next`, recovery and consent wording. No new providers. |
| `/forgot-password` · `forgot-password.tsx` | Matching recovery form and sent/error states. | Reset request, redirect, pending state and return link. |
| `/reset-password` · `reset-password.tsx` | Matching password form and action hierarchy. | Session checks, validation, password update and navigation. |
| `/terms` · `terms.tsx` | Editorial reading width and section hierarchy. | Exact bilingual text, dates, operator and links. |
| `/privacy` · `privacy.tsx` | Same readable editorial layout. | Exact policy, dates and controller/contact details. |
| `/contact` · `contact.tsx` | Polished email/phone/WhatsApp/location records. | Contact values and destinations; no new form or invented promises. |
| `/onboarding` · `onboarding.tsx` | Branded dedicated wizard, compact step navigation, consistent type choices, import controls and completion summary. | Five steps plus completion, resume/gating, Other description/AI analysis, presets, profile/hours/services/staff, seating capacity, skip/save and completion links; unchanged required fields/defaults. |
| `/dashboard` · `dashboard.tsx` | Business-first overview, compact existing metrics, divider-led setup and aligned service/staff previews. | Date/status/hours/counts, readiness, queries/realtime, empty/error states and links. No invented voice metrics. |
| `/ai-receptionist` · `ai-receptionist.tsx` | Refined chat workspace, readable roles, anchored composer, compact data/activity sidebar and settings tab; waveform replaces orb decoration. | `/api/chat` streaming/auth/session, reset/suggestions/busy guard, handoff/booking/cancellation markers, data readiness, settings/FAQ editing and tabs. |
| `/web-call` · `web-call.tsx` | Real call tool primary: unmistakable state, start/end command, readable transcript/errors, compact existing diagnostics. | Authenticated config, microphone permission, lazy Vapi loading, linked/transient targeting, single-call guard, connect/cancel/end, call ID/events/transcript, cleanup and history link. No client remount on styling/language changes. |
| `/appointments` · `appointments.tsx` | Aligned desktop records, complete stacked mobile records, filter strip, badges and polished dialogs. | Upcoming/today/past/all, customer identity, dates/duration, services/staff/notes/party size, source/calendar labels, all status/edit/delete actions and realtime/payloads. |
| `/calendar` · `calendar.tsx` | Clean weekly agenda, day separators, today indicator and labelled booking entries; stacked mobile days. | Week range/navigation/Today, queries/sorting, hours/closed states and cancelled exclusion. No drag/drop or logic rewrite. |
| `/customers` · `customers.tsx` | Search toolbar, aligned contacts/visit columns and wrapped mobile details. | Search, name/phone/email/notes, visit calculations, CRUD/confirmation and realtime. |
| `/calls` · `calls.tsx` | Dense conversation records with clear channel/status/summary; inline expanded details and readable transcript. | Phone/web/chat, times/duration/numbers/session key, expansion, copy/delete and realtime. No invented recording URLs or new playback. |
| `/notifications` · `notifications.tsx` | Scannable activity feed, distinct unread and staff-help emphasis with request/problem prominent. | Separate event kinds, caller/details, business-timezone dates, call/booking links, individual/all read and bell synchronization. |
| `/services` · `services.tsx` | Polished menu rows, aligned price/duration, badges and consistent editor. | CRUD/validation, exact owner content, price/duration/activation and confirmation. |
| `/staff` · `staff.tsx` | Compact records, readable assignments/shifts and polished weekly editor. | CRUD, active state, service links, day/hour fields, validation and confirmation. |
| `/faq` · `faq.tsx` | Clear question/answer hierarchy and matching editor. | Existing CRUD/activation and exact business answers. |
| `/analytics` · `analytics.tsx` | Restrained existing KPI grid, aligned top services and semantic weekday bars. | Exact calculations/time window/data sources/realtime and zero/empty states. No new metrics or revenue changes. |
| `/settings` · `settings.tsx` | Mobile-safe Profile/Hours/Calendar/Phone/Account tabs and unframed sections. | Business fields, hours, Google connect/disconnect/select, voice enable/number/greeting/assistant ID, key create/copy/revoke and language. Never place keys in new summaries. |
| `/.lovable/oauth/consent` · `[.]lovable.oauth.consent.tsx` | Matching authorization/error layout, requesting-app identity and Approve/Deny. | Search validation, sign-in/next, loader, approval/denial and redirect. Presentation/metadata only. |
| `/oauth/google-calendar/return` · `oauth/google-calendar/return.tsx` | Minimal branded popup finishing/error screen. | Completion/failure messages, origin checks, exchange-code handling and close timing. |

## Shared files and technical boundaries
**Visual files:** `src/styles.css`; `src/components/app-shell.tsx`, `public-page.tsx`, `LanguageToggle.tsx`, `ai-background.tsx`, `states.tsx`, `business-form.tsx`, `business-hours-form.tsx`, `smart-import.tsx`, `faq-manager.tsx`, `nagi-settings.tsx`, `google-calendar-panel.tsx`, `voice-panel.tsx`, `nagi-web-call.tsx`; every screen above. Preserve handlers/effects/payloads, all 13 navigation destinations, sign-out cache clearing and bell subscriptions.

Update used `src/components/ui/` controls without changing props/semantics. `src/routes/__root.tsx`: fonts/document/404/error/retry presentation only; preserve providers, Outlet, Scripts, auth invalidation, toast and reporting. `src/lib/i18n.tsx`: interface labels only, never business content/persistence. Check every leaf `head()` for unique NAGI/social metadata. Isolate visual helpers/assets; document structural choices in `AGENTS.md` during implementation.

**Untouched:** `_authenticated/route.tsx` auth guard/SSR/Outlet; generated routing/bootstrap, `src/start.ts`, integration clients, server functions, `src/lib/api.ts`, NAGI brain/booking and all Vapi SDK/protocol/session/centralized `vapi-web-conversation.ts` logic.

**Nonvisual routes unchanged:** `/api/chat`, `/api/voice/web-config`, `/api/public/agent/vapi`, `/api/public/agent/$tool`, `/api/public/voice/incoming`, `/api/public/voice/turn`, `/api/public/voice/status`, `/mcp`, `/.well-known/oauth-protected-resource`. No RLS/auth settings, mappings, secrets, dependencies, calendar permissions or tool-schema changes.

## Sequence and risks
Review the existing presentation edits against this plan before further styling. Changes outside the visual allowlist require separate authorization. Do not treat this plan as approval to run mutating production tests.
1. Baseline every route/action; establish tokens and shared controls.
2. Shared/public/account layouts and utility states.
3. Onboarding and reusable business editors.
4. Operational records/calendar/dashboard/analytics/notifications.
5. Chat/Web Call presentation last, then full bilingual/mobile/regression verification.

Risks: global tokens affect portals/native inputs; long Japanese/business text; denser layouts hide actions; remounts duplicate voice effects; popup changes break completion timing; attractive status treatments imply readiness incorrectly. Preserve component identity/event handlers and compare action inventories. Report unrelated logic defects separately rather than silently redesigning them.

## Exact implementation acceptance checks
- Harness build/typecheck passes; inspect latest build/runtime/console logs. No manual builds/typechecks.
- Run `bun test tests/vapi-protocol.test.ts tests/vapi-web-conversation.test.ts` and `bun run lint`; distinguish existing failures. Diff visual allowlist, routes and unchanged API/server/data/secret files/URLs.
- Playwright every screen at 1440×900, 1280×1800, 768×1024 and 390×844, JA/EN: screenshots, drawer/tabs/dialogs, long text/transcripts, loading/empty/errors, keyboard, 200% zoom, reduced motion, focus, overflow and 4.5:1 text contrast.
- Verify public/contact links, account validation/confirmation/safe redirects/recovery. Hosted auth settings require a hosted read.
- With separate explicit test authorization, two authenticated businesses: identical theme, isolated data and clean sign-out. Approved test business only: onboarding/resume/Other and real temporary service/staff/FAQ/customer/booking CRUD with reload/readback; hours/party size/filters/calendar/exact analytics. Clean up only these records; no demo fixtures.
- Real Google connect/select/disconnect/popup only on approved test connection; preserve production. Missing access means unverified.
- With separate explicit test authorization, real chat: stream/reset, missing info, confirmation, unavailable slot, identity refusal/staff-help; read back bookings/history/notifications/bell, no false success.
- With separate explicit test authorization, real browser call: start/rapid repeats/connect/cancel/end, mic refusal, errors/transcript/history/bell. Preserve Vapi voice + NAGI brain. Fake mic cannot prove speech; owner audio test may incur provider usage.
- Phone: protocol tests/unchanged-code review; real inbound check needs connected line/authorization. Otherwise mark unverified; never change forwarding or publish for testing.
- Deliver route coverage and named blocked checks, not blanket success. Publishing requires separate authorization.

## Current review limitations
- Ten existing Vapi protocol/conversation tests passed; the latest harness build reported success.
- Repository lint is not clean: 13 formatting errors and nine warnings remain; do not claim lint passed or expand this visual scope to fix server/config code.
- Read-only route rendering covered Japanese and English mobile layouts; editor open/dismiss and transcript expansion were observed. Microphone denial returned an actionable error, but no real audio call was verified in these checks.
- Prior chat checks produced stored conversations and reported an unusual Saturday opening interval; investigate that separately with owner-approved data review, not as a visual change.
- Full signup/onboarding mutation, two-tenant isolation, calendar OAuth, live bookings, rapid-repeat real calls, phone calls, keyboard/zoom and contrast checks remain acceptance work rather than verified successes.
- No publishing is included.
