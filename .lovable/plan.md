# NAGI AI — full-application visual redesign

## Scope and boundaries

Create a cohesive premium AI voice-agent SaaS experience across **every existing screen**, using graphite/ink surfaces, restrained teal/electric-cyan voice accents, clean bilingual typography, and polished operational layouts.

This is a plan only. No source, backend, API, database, schema, secret, provider configuration, or published-site changes have been made. Implementation must preserve every route, feature, data flow, validation rule, and action. No demo records, new integrations, or publishing. The authorized project is NAGI AI.

## Verified starting point

- `src/styles.css` has semantic OKLCH tokens, warm light defaults, a `.dark` palette, and additional glass/gradient/washi animation utilities. Dark tokens exist; automatic theme switching was not established by the source review.
- `app-shell.tsx` provides desktop sidebar, mobile Sheet navigation, two navigation groups, sign-out, language toggle, and a realtime notification bell. Onboarding and public screens have separate layouts.
- Existing business pages use React Query hooks and realtime subscriptions. Preserve these patterns rather than replacing data loading during a visual redesign.
- `/ai-receptionist` is the authenticated text-chat sandbox; `/web-call` is the separate browser Vapi screen. They must remain separate, with existing navigation intact.
- The landing page contains an existing scripted call illustration. Call history displays channels, status, duration, summary, session ID, transcript, copy and delete controls; its current JSX does not expose recording playback.
- Two existing Bun test files cover Vapi protocol parsing and centralized conversation tuning. These are not full application coverage. This review is source-based, not a claim that live auth, calendar, booking, or voice flows have passed.

## Cohesive visual direction

- **Surfaces:** graphite canvas, slightly lifted neutral panels, deeper ink navigation, crisp hairline borders. Avoid an all-blue palette, floating gradient blobs, glass-heavy layers, and decorative orbs.
- **Accents:** teal for primary commands, electric cyan for voice activity/focus, separate accessible success, warning, and destructive tokens. No glow on every control.
- **Typography:** retain Japanese-capable Zen Kaku Gothic New/Noto Sans JP; consistent heading/body hierarchy, zero letter spacing, fixed font sizes rather than viewport-scaled type. Tabular numbers for time, price, counts; load the declared mono font if used.
- **Geometry:** 4–8px radii for cards and controls; unframed page sections and divider-led layouts, not cards inside cards. Reserve framed containers for tools, dialogs, and repeated records.
- **Controls:** use existing shadcn Button and Radix primitives. Consistent Lucide icons, tooltips for unfamiliar icon commands, labelled statuses, visible focus, and clear pending/disabled/error states.
- **Voice identity:** a compact NAGI wordmark and waveform, not a robot or orb. In real call screens, motion follows existing reported call/activity state; never invent microphone levels, latency, connection success, or booking outcomes.
- **Motion:** short transitions and state-linked waveform motion only; respect reduced motion. No new animation library.
- **Mobile:** retain the navigation drawer; wrap page actions, horizontally scroll tab strips where needed, stack form fields, and keep dialogs scrollable with reachable actions. Dense lists become stacked records without losing fields or commands. Maintain usable touch targets and no page-level horizontal overflow.
- **Theme application:** make the requested dark premium palette the consistent default through existing semantic tokens, including native date/time controls and portals. Retain compatible alternate tokens; do not add a theme-setting feature.

## Route-by-route implementation

Authenticated screen files below are under `src/routes/_authenticated/`; public and utility files are under `src/routes/`. Paths are unchanged.

| Existing URL / file | Visual treatment | Behavior to preserve |
|---|---|---|
| `/` — `index.tsx` | Brand-led immersive voice-themed cover with a relevant locally stored visual asset, text directly over the scene, restrained waveform accents, and the next section visible. Restyle existing industry tabs, feature sections, steps, CTAs, footer, and scripted illustration; avoid split card hero. | Existing language switches, script progression, industry selection, and auth/legal links. No new demo data or simulated live results; existing illustration remains clearly illustrative. |
| `/auth` — `auth.tsx` | Consistent brand header, focused account form, balanced field spacing, distinct notice/error areas, accessible legal links. | Login/signup modes, full-name field, validation, submit guard, email-confirmation notice, safe `next` redirects, password recovery and consent wording. No added sign-in providers. |
| `/forgot-password` — `forgot-password.tsx` | Same account layout, email field and clear sent/error states. | Existing reset request, redirect target, submit state and return link. |
| `/reset-password` — `reset-password.tsx` | Matching recovery layout and password/action hierarchy. | Session checks, existing password validation/update and navigation. |
| `/terms` — `terms.tsx` | Editorial reading width, clear section hierarchy, dates and shared public navigation. | Exact bilingual legal text, operator details and links; no legal-policy rewrite. |
| `/privacy` — `privacy.tsx` | Same editorial system, readable paragraphs and section spacing. | Exact bilingual policy, controller/contact details and dates. |
| `/contact` — `contact.tsx` | Polished email/phone/WhatsApp/location records with familiar icons. | Existing contact values, `mailto:`, `tel:`, WhatsApp destination and copy. No new form or invented support promises. |
| `/onboarding` — `onboarding.tsx` | Dedicated branded setup layout, compact step navigation, unframed form sections, consistent type selection, import controls and completion summary. | Five setup steps plus completion, resume behavior, step gating, Other description/AI analysis, presets, saved profile/hours/services/staff, seating capacity, skip/save actions and completion links. Do not change required fields or defaults. |
| `/dashboard` — `dashboard.tsx` | Business-first overview, compact existing metrics, divider-led setup progress, aligned service/staff previews. | Business status/date/hours, existing counts, setup readiness, query/realtime subscriptions, empty/error states and links. No invented voice metrics. |
| `/ai-receptionist` — `ai-receptionist.tsx` | Refined chat workspace, readable message roles, anchored composer, compact activity/data sidebar and matching settings tab. Replace orb decoration with waveform identity. | `/api/chat` streaming, bearer/session handling, reset and suggestion actions, busy guard, handoff/confirmed/cancelled markers, data readiness, settings and FAQ editing. Preserve all tabs. |
| `/web-call` — `web-call.tsx` | Make the real call tool the primary unframed experience: unmistakable status, start/end command, readable live transcript/errors, compact existing diagnostics. | Authenticated config request, microphone permission, lazy Vapi loading, linked/transient assistant targeting, single-call guard, start/cancel/end states, call ID, transcript events, cleanup and history link. Do not remount the client when styling or switching language. |
| `/appointments` — `appointments.tsx` | Aligned desktop record columns and complete mobile records; compact filter strip, source/status/calendar badges, polished add/edit/delete dialogs. | Upcoming/today/past/all filters, customer identity, dates, duration, service/staff choices, notes, party size, all status actions, delete confirmation, mutation payloads and realtime refresh. |
| `/calendar` — `calendar.tsx` | Clean weekly agenda with clear day separators, today indicator, hours and status-labelled entries; stack days on mobile. | Existing week navigation/range queries, Today action, sorting, closed-day messaging and cancelled-booking exclusion. No drag/drop or calendar logic rewrite. |
| `/customers` — `customers.tsx` | Search toolbar, aligned contact/visit columns, wrapped mobile details and consistent edit dialogs. | Search semantics, name/phone/email/notes, visit count and last-visit calculation, CRUD, deletion confirmation and realtime updates. |
| `/calls` — `calls.tsx` | Dense conversation records with channel/status/duration hierarchy; inline expanded details and high-readability transcript area. | Phone/web/chat labels, summary, numbers, session key, expanded selection, transcript text, copy/delete and realtime history. Do not invent recording URLs or add playback in this scope. |
| `/notifications` — `notifications.tsx` | Clear unread treatment, distinct staff-follow-up emphasis and scannable event rows; request/problem remains prominent. | Separate event kinds, caller/request details, business-timezone dates, call/appointment links, individual/all read actions and bell count synchronization. No notification logic changes. |
| `/services` — `services.tsx` | Polished menu rows, aligned price/duration, active badges, familiar edit/delete commands and consistent forms. | CRUD, validation, owner-entered names/descriptions, prices, durations, activation and delete confirmation. |
| `/staff` — `staff.tsx` | Compact staff records, readable service assignments and weekly shifts; polished assignment/hour editor. | CRUD, active flags, service links, working-day/hour inputs, existing validation and confirmations. |
| `/faq` — `faq.tsx` | Readable knowledge-base rows, clear question/answer hierarchy and matching editor. | Existing FAQ create/edit/delete/activation and exact business-entered answers. |
| `/analytics` — `analytics.tsx` | Restrained existing KPI grid, semantic chart colors, aligned top-service list and weekday bars. | Exact existing calculations, time window, zero/empty states, data sources and realtime subscriptions. No new metrics or altered revenue math. |
| `/settings` — `settings.tsx` | Consistent mobile-safe tabs and unframed Profile, Hours, Calendar, Phone and Account sections. | Business fields, opening hours, Google connect/disconnect/select actions, voice enable/number/greeting/assistant ID, key create/copy/revoke and interface language. Never expose keys in new summaries. |
| `/.lovable/oauth/consent` — `[.]lovable.oauth.consent.tsx` | Matching authorization dialog and error layout; visible requesting-app name and balanced Approve/Deny controls. | Search validation, sign-in/`next`, authorization loader, approve/deny and external redirect. UI JSX/metadata only; no loader/auth changes. |
| `/oauth/google-calendar/return` — `oauth/google-calendar/return.tsx` | Minimal branded finishing/error screen suited to a popup. | Existing completion/failure `postMessage`, origin scoping, exchange-code handling and window close timing. |

## Shared layouts and likely files

- `src/styles.css`: consolidate semantic surface/action/status/chart/shadow tokens; restyle existing utilities and reduce decorative effects.
- `src/components/app-shell.tsx`: sidebar/header/page titles/actions/mobile drawer; preserve all 13 navigation destinations, sign-out cache clearing, bell queries and subscriptions.
- `src/routes/__root.tsx`: presentation of 404/error/retry, font links and theme-compatible document styling only. Preserve QueryClient, language/auth providers, Outlet, Scripts, toast mounting and error reporting.
- `src/routes/_authenticated/route.tsx`: **no edits needed**; keep auth guard, `ssr: false` and Outlet intact.
- `src/components/public-page.tsx`, `LanguageToggle.tsx`, `ai-background.tsx`, `states.tsx`: shared public shell/footer, language control, waveform/background and loading/empty/error treatment.
- `business-form.tsx`, `business-hours-form.tsx`, `smart-import.tsx`, `faq-manager.tsx`, `nagi-settings.tsx`, `google-calendar-panel.tsx`, `voice-panel.tsx`, `nagi-web-call.tsx`: presentation only; preserve handlers, queries, effects and payloads.
- Used `src/components/ui/` primitives: Button, Card, Badge, Input, Textarea, Label, Select, Tabs, Table, Dialog/AlertDialog, Sheet, Switch, Checkbox, Progress, Skeleton, Tooltip and Sonner. Preserve public props and interaction semantics; avoid unnecessary edits to unused primitives.
- All content route files in the table; `src/lib/i18n.tsx` only for interface labels currently hardcoded in English, without changing business content or language persistence. Inspect each content route's `head()`; retain unique NAGI titles/descriptions and fill missing social metadata without changing paths.
- Any new visual-only helper/asset must be isolated from data and voice logic. Document structural choices in `AGENTS.md` during implementation, not during this review.

## Explicitly untouched technical routes and logic

Keep `/api/chat`, `/api/voice/web-config`, `/api/public/agent/vapi`, `/api/public/agent/$tool`, `/api/public/voice/incoming`, `/api/public/voice/turn`, `/api/public/voice/status`, `/mcp`, and `/.well-known/oauth-protected-resource` unchanged. Keep generated route tree/router bootstrap, `src/start.ts`, all integration clients, server functions, `src/lib/api.ts`, NAGI brain/booking modules, Vapi SDK/protocol/session modules and `vapi-web-conversation.ts` unchanged. No database/RLS/auth setting, schema, dependency, secret, phone mapping, calendar permission or tool-schema changes.

## Implementation order and risks

1. Capture current route/action baselines; establish tokens and shared controls.
2. Update shared/public/account layouts and utility states.
3. Update onboarding and reusable business editors.
4. Update operational lists, calendar, dashboard, analytics and notifications.
5. Update chat and Web Call presentation last; complete bilingual/mobile/regression verification.

Main risks: shared token changes affecting portals/native inputs; Japanese and long business text overflow; hiding commands in denser records; call-client remounts or duplicated effects; breaking popup timing; accidentally relabelling unavailable features as ready. Preserve component identity and event handlers, use labelled states, and compare action inventories before/after. Existing logic defects discovered during verification are reported separately, not silently redesigned.

## Exact acceptance checks for implementation

- Harness build/typecheck must pass; inspect the newest `/tmp/observability/build-errors.log` plus runtime/console errors. Do not manually run project builds/typechecks.
- Run `bun test tests/vapi-protocol.test.ts tests/vapi-web-conversation.test.ts` and `bun run lint`; distinguish pre-existing failures from regressions.
- Compare changed files against the visual-only allowlist and route inventory; verify protected/API/server/data/secret files and all endpoint URLs are unchanged.
- Playwright screenshots and interaction checks at 1440×900, 1280×1800, 768×1024 and 390×844, in Japanese and English: every content route, drawer, tabs, dialogs, long names, long transcripts, empty/loading/error states, keyboard navigation, 200% zoom and reduced motion. Check 4.5:1 normal-text contrast, focus visibility and overflow.
- Public flow: all CTAs/legal/contact links; login/signup switching, validation, confirmation notice, safe redirect and password recovery. Hosted auth settings remain unverified without a hosted-settings read; do not claim settings from JSX alone.
- With authenticated accounts for two businesses, confirm the same design and distinct menus/bookings/calls/notifications; sign-out clears prior-owner data. Test new-owner onboarding/resume and Other business description without changing production profiles.
- In an approved test business, create/edit/delete a real temporary service, staff member, FAQ, customer and manual booking; reload and confirm saved data; verify hours, party size, filters, weekly calendar and exact analytics figures. Clean up only these test records—never add demo fixtures.
- Verify real Google Calendar connect/select/disconnect and popup completion only on an approved test connection. Preserve current production connection; unavailable credentials mean an explicitly unverified check.
- Exercise chat with real business input and verify stream/reset, missing information, confirmed booking, unavailable slot, identity refusal and staff-help alerts through the existing UI. Read results back in appointments/history/notifications; no false-success badges.
- Exercise one real browser call: start, rapid repeat click, connect, cancel/end, permission refusal, existing errors, transcript and saved call history/bell update. Keep Vapi voice + NAGI brain and centralized turn-taking unchanged. A fake-microphone connection cannot verify speech quality; spoken verification needs real audio and may incur provider usage.
- Phone webhook/tool behavior: existing protocol tests plus unchanged-code review. Real inbound testing requires an existing connected line and owner authorization; report it unverified if unavailable. Do not modify forwarding or publish to make a test possible.
- Approval to implement is separate from publishing. Completion requires a coverage report naming any blocked live checks, not a blanket claim that everything works.