# NAGI AI — complete visual redesign plan

## Scope
Create a premium AI voice-agent SaaS theme across every existing screen: graphite/ink surfaces, restrained teal/electric-cyan accents, clean bilingual typography and polished operational layouts.

**Plan only.** No source or live-site changes have been made. Implementation preserves all routes, features, validation and behavior. No backend/API/database/schema/secrets/provider changes, feature removal, new demo data or publishing. NAGI AI is the authorized project.

## Verified starting point
- `src/styles.css` contains semantic OKLCH tokens, warm light defaults, `.dark` tokens and glass/gradient/washi utilities. A theme-switching mechanism was not established by inspection.
- `app-shell.tsx` provides desktop sidebar, mobile Sheet, two navigation groups, sign-out, language toggle and realtime notification bell. Public screens and onboarding use separate layouts.
- Business pages use React Query hooks and realtime subscriptions: preserve these rather than replacing data loading.
- `/ai-receptionist` is the owner text-chat sandbox; `/web-call` is the separate Vapi browser call screen.
- Landing contains an existing scripted illustration. History displays channel/status/duration/summary/session ID/transcript with copy/delete; its JSX does not expose recording playback.
- Two Bun test files cover Vapi parsing and centralized turn-taking, not full application behavior. This review is source-based; live auth/calendar/booking/voice verification remains an implementation check.

## Visual system
- **Palette:** neutral graphite canvas, lifted surfaces, deeper ink sidebar and hairline borders. Teal primary commands, cyan voice activity/focus; distinct accessible success/warning/destructive colors. Avoid an all-blue theme, gradient blobs, decorative orbs and pervasive glass/glow.
- **Typography:** retain Japanese-capable Zen Kaku Gothic New/Noto Sans JP. Consistent fixed-size hierarchy, zero letter spacing, tabular figures; load the declared mono font if used. No viewport-scaled text.
- **Layout:** 4–8px card/control radii; divider-led, unframed page sections. Cards only for repeated records, tools and dialogs—not nested page sections.
- **Controls:** existing shadcn Button/Radix primitives and Lucide icons; tooltips, keyboard focus, labelled status and clear pending/disabled/error treatment.
- **Voice identity:** compact NAGI wordmark/waveform. Real-call animation follows existing reported state; never invent microphone levels, latency, connection or booking success.
- **Mobile:** retain drawer; wrap actions, scroll tab strips locally, stack fields/records, keep dialog actions reachable, preserve every field/action and prevent page overflow. Respect reduced motion and usable touch targets.
- **Theme:** consistent dark premium default via semantic tokens, including portals and native inputs; retain compatible alternate tokens without adding a theme-setting feature.

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
**Likely visual changes:**
- `src/styles.css`: consolidate semantic surface/action/status/chart/shadow tokens and simplify decoration.
- `src/components/app-shell.tsx`: navigation/header/page actions/drawer; preserve all 13 destinations, sign-out cache clearing and bell subscriptions.
- `src/routes/__root.tsx`: fonts, document styling and 404/error/retry presentation only; preserve providers, Outlet, Scripts, auth invalidation, toast and error reporting.
- `public-page.tsx`, `LanguageToggle.tsx`, `ai-background.tsx`, `states.tsx`: public shell/footer, language control, waveform/background and loading/empty/error presentation.
- `business-form.tsx`, `business-hours-form.tsx`, `smart-import.tsx`, `faq-manager.tsx`, `nagi-settings.tsx`, `google-calendar-panel.tsx`, `voice-panel.tsx`, `nagi-web-call.tsx`: presentation only; preserve hooks, effects, handlers and payloads.
- Used `src/components/ui/` primitives: Button/Card/Badge/Input/Textarea/Label/Select/Tabs/Table/Dialog/AlertDialog/Sheet/Switch/Checkbox/Progress/Skeleton/Tooltip/Sonner. Preserve props/semantics; avoid unnecessary unused-component edits.
- Every screen file above; `src/lib/i18n.tsx` only for currently hardcoded interface labels, never business content/persistence. Check every content `head()` for unique NAGI title/description and social metadata. Isolate any new visual helper/asset; record structural choices in `AGENTS.md` during implementation.

**Untouched:** `_authenticated/route.tsx` auth guard, SSR setting and Outlet; generated route tree/router/bootstrap and `src/start.ts`; all integration clients, server functions, data hooks (`src/lib/api.ts`), NAGI brain/booking, Vapi SDK/protocol/session and centralized `vapi-web-conversation.ts`.

**Nonvisual routes unchanged:** `/api/chat`, `/api/voice/web-config`, `/api/public/agent/vapi`, `/api/public/agent/$tool`, `/api/public/voice/incoming`, `/api/public/voice/turn`, `/api/public/voice/status`, `/mcp`, `/.well-known/oauth-protected-resource`. No RLS/auth settings, phone mappings, secrets, dependencies, calendar permissions or tool-schema changes.

## Sequence and risks
1. Baseline every route/action; establish tokens and shared controls.
2. Shared/public/account layouts and utility states.
3. Onboarding and reusable business editors.
4. Operational records/calendar/dashboard/analytics/notifications.
5. Chat/Web Call presentation last, then full bilingual/mobile/regression verification.

Risks: global tokens affect portals/native inputs; long Japanese/business text; denser layouts hide actions; remounts duplicate voice effects; popup changes break completion timing; attractive status treatments imply readiness incorrectly. Preserve component identity/event handlers and compare action inventories. Report unrelated logic defects separately rather than silently redesigning them.

## Exact implementation acceptance checks
- Harness build/typecheck passes; check newest `/tmp/observability/build-errors.log` and runtime/console logs. No manual project builds/typechecks.
- Run `bun test tests/vapi-protocol.test.ts tests/vapi-web-conversation.test.ts` and `bun run lint`; distinguish existing failures from regressions.
- Diff against the visual allowlist and route inventory; confirm all API/server/data/secret files and endpoint URLs unchanged.
- Playwright screenshots/interactions on every content screen at 1440×900, 1280×1800, 768×1024 and 390×844 in JA/EN: drawer/tabs/dialogs, long names/transcripts, loading/empty/errors, keyboard, 200% zoom, reduced motion, 4.5:1 normal-text contrast, focus and overflow.
- Public links/CTAs/contact destinations; login/signup validation, confirmation notice, safe redirect and recovery. Do not claim hosted auth settings without a hosted read.
- Authenticated checks with two businesses: identical design, isolated menus/bookings/calls/notifications and clean sign-out. Test onboarding/resume/Other in an approved test business, not production profiles.
- Approved test business: real temporary service/staff/FAQ/customer/manual-booking CRUD and reload/readback; verify hours, party size, filters/calendar and exact analytics. Remove only created test records; no demo fixtures.
- Real Google connect/select/disconnect and popup completion only on an approved test connection; preserve production connection. Missing credentials means explicitly unverified.
- Chat with real business input: stream/reset, missing info, confirmed booking, unavailable slot, identity refusal and staff-help notification. Read results in bookings/history/bell; no false success.
- One real browser call: start/rapid repeat/connect/cancel/end, microphone refusal, error/transcript and saved history/bell. Vapi voice + NAGI brain unchanged. Fake microphone cannot prove spoken quality; real audio requires owner testing and may incur provider usage.
- Phone: existing protocol tests and unchanged-code review; real inbound validation requires a connected line and authorization. Otherwise report unverified—do not change forwarding or publish for testing.
- Completion includes route coverage and named blocked checks, never a blanket claim. Implementation approval is not publishing approval.
