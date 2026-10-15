# NAGI AI — full-application premium visual plan

## Scope and verified baseline
NAGI AI is the authorized project. This is a **plan-only review**, not implementation approval. The current source already has a dark graphite/teal theme, Japanese-capable fonts, a local voice-cover image, divider-led records, desktop sidebar and mobile drawer. Refine and unify that baseline rather than rebuild the application.

The review covers all 23 content routes, shared layouts, reusable editors, chat/Web Call presentation, account flows and OAuth screens. Current navigation contains 13 destinations; onboarding has its own layout. Settings has Business, Hours, Calendar, Phone and Account tabs. The landing page contains an existing scripted call illustration; it is not evidence of a live booking.

**Hard limits:** preserve URLs, all features, existing validation, data fetching, authentication, tenant separation, booking authority, Calendar and Vapi behavior. No backend/API/database/schema/secrets changes, new demo data, removed functionality, provider changes or publishing. Only the plan is written during this review.

## Cohesive visual direction
- **Graphite workspace:** neutral ink canvas, subtly lifted surfaces, crisp dividers and restrained teal commands/cyan voice accents. Distinct success, warning and destructive colors; no pervasive glow, purple gradients or decorative orbs.
- **Bilingual typography:** retain Zen Kaku Gothic New/Noto Sans JP and existing mono font for identifiers. Fixed-size hierarchy, zero letter spacing, readable Japanese line lengths and tabular numbers.
- **Structure:** consistent page titles, action placement, spacing and density. Unframed page sections; cards only for repeated items, dialogs and genuinely framed tools. Radii at most 8px.
- **Controls and states:** shared Button/Radix controls, consistent Lucide icons, accessible names and tooltips for unfamiliar icons. Clear pending, disabled, selected, empty, error and retry presentation; status conveyed by text as well as color.
- **Voice identity:** compact NAGI branding and understated waveform treatment. Real-call animation follows existing reported states, never fabricated microphone levels, latency, connection status or booking success.
- **Mobile:** preserve every destination/action; locally scroll tabs, wrap action rows, stack complete records/forms, and keep dialogs and chat composer usable with the keyboard open. Respect reduced motion.

## Route-by-route plan
Every path below stays unchanged. The “preserve” column is an implementation boundary, not a claim that the live flow has been verified.

| Route | Presentation work | Preserve |
|---|---|---|
| `/` | Refine existing immersive image cover, prominent NAGI AI heading, legible copy/commands and a visible hint of the next section. Unify industry tabs, existing scripted illustration, feature bands and footer. | Language switch, industry selection, script progression and account/legal links. Do not add live-looking fabricated results or another simulator. |
| `/auth` | Focused branded login/signup form, aligned fields, notices, errors and legal links. | Sign-in/signup, name/validation, email-confirmation notice, busy guards, safe `next`, consent and recovery links. No new sign-in provider. |
| `/forgot-password` | Matching recovery form and clear sent/error states. | Reset request, pending guard, redirect and return link. |
| `/reset-password` | Matching password form and action hierarchy. | Session checks, validation, password update and navigation. |
| `/terms` | Comfortable editorial reading width, section dividers and bilingual heading hierarchy. | Exact legal text, dates, operator information and links. |
| `/privacy` | Same editorial system and readable long-form text. | Exact policy, dates, controller information and links. |
| `/contact` | Polished email, phone, WhatsApp and location records. | Muhammad Arslan’s existing contact values/destinations. No new contact form or response-time promises. |
| `/onboarding` | Dedicated branded wizard with compact progress, coherent business-type choices, import controls, complete editors and completion summary. | Existing type/profile/hours/services/staff steps, resume/gating, Other description and AI analysis, presets, seating capacity, required fields/defaults, skip/save and completion links. No flow changes. |
| `/dashboard` | Business-first overview, compact existing counts, clear hours/status, divider-led setup progress and aligned service/staff previews. | Current calculations, data hooks, realtime, readiness, loading/error/empty states and links. No new voice metrics. |
| `/ai-receptionist` | Refine chat roles, transcript readability, anchored composer, compact business-data/activity sidebar and settings tab. Use restrained waveform branding rather than orb styling. | Existing streaming transport, session/reset/clear, suggestions, busy guards, booking/handoff markers, readiness, NAGI settings and FAQ editing. No prompt or brain changes. |
| `/web-call` | Make the real call tool primary: clear state, start/end/cancel commands, readable transcript and errors; subordinate but retain call ID/event diagnostics. | Authenticated config, microphone permissions, lazy SDK loading, assistant targeting, duplicate-call guard, events, transcript, cleanup and history link. Styling or language changes must not remount an active call. |
| `/appointments` | Aligned desktop records, complete mobile rows, clear filters/statuses and consistent editing/confirmation dialogs. | Existing filters, identity/date/duration/service/staff/notes/party-size fields, source/Calendar labels, status/edit/delete actions, payloads and realtime. |
| `/calendar` | Clean weekly agenda, day separators, today emphasis and readable appointment labels; stack days on narrow screens. | Week navigation/Today, range/sorting, hours/closed states and cancelled exclusion. No drag/drop or scheduling rewrite. |
| `/customers` | Search toolbar, aligned contact/visit details, complete wrapped mobile records and consistent editor. | Search, name/phone/email/notes, visit calculations, CRUD, confirmations and realtime. |
| `/calls` | Scannable channel/status/summary rows, expanded details, readable transcript and clear copy/delete tools. | Existing phone/web/chat labels, timestamps, duration, numbers/session identifiers, expansion and realtime. No new playback feature or invented recording URLs. |
| `/notifications` | Divider-led activity feed; strong unread distinction and prominent staff-help request/problem details. | Event kinds, caller/details, timezone formatting, call/booking links, individual/all read actions and bell synchronization. |
| `/services` | Consistent menu rows, aligned prices/durations, activation badges and editor. | Exact owner content, CRUD/validation, price/duration/active state and confirmations. |
| `/staff` | Compact staff records, readable service assignments and polished weekly-hours editor. | CRUD, active state, service links, day/time fields, validation and confirmations. |
| `/faq` | Clear question/answer hierarchy and matching editor. | Existing CRUD/activation and exact business answers. |
| `/analytics` | Refine existing KPI grid, top-service rows and weekday bars using semantic chart colors. | Current data sources/calculations/time window/realtime and zero/empty states. No additional metrics or changed revenue logic. |
| `/settings` | Consistent five-tab layout, mobile-safe tab strip and unframed profile/hours/connection/account sections. | Business fields/import, hours, Google connect/disconnect/select, voice enable/phone/greeting/assistant selection, key create/copy/revoke and language. Never surface keys in new summaries. |
| `/.lovable/oauth/consent` | Matching authorization and error presentation, prominent requesting-app identity, clear Approve/Deny commands. | Search/session checks, loader, decision handlers and redirects. No permission changes. |
| `/oauth/google-calendar/return` | Minimal branded finishing/error screen. | Existing success/failure messages, exchange-code handling, same-origin messaging and immediate popup-close behavior. |

Also unify root 404/error/retry screens, toasts, skeletons, empty states and all dialogs/menus/sheets.

## Technical scope and preservation boundaries
**Presentation allowlist:** `src/styles.css`; shared `app-shell`, `public-page`, `LanguageToggle`, `ai-background`, `states`; business/hours/import/FAQ/NAGI-settings/Google-Calendar/voice/Web-Call components; used `src/components/ui` primitives; content routes above. Reuse semantic tokens instead of hardcoded colors. Retain component identities, refs, handlers, effects, hook order and payloads. Improve keyboard semantics of existing visual selectors without changing selection/gating behavior.

`src/routes/__root.tsx`: document/font and error/404 presentation only; retain providers, Outlet, Scripts, auth invalidation, toast and reporting. Leaf metadata remains unique and NAGI-specific; preserve titles/descriptions/social tags. Bundled cover images do not get relative social-image URLs. Translation edits, if needed, are interface labels only, never business data or policies.

**Untouched:** auth guard, generated routing/bootstrap, `src/start.ts`, integration clients, data hooks/server functions, NAGI brain/booking, Vapi SDK/protocol/session logic and centralized `src/lib/vapi-web-conversation.ts`. Preserve sidebar destinations, sign-out cache clearing and bell subscriptions.

**Nonvisual routes unchanged:** `/api/chat`, `/api/voice/web-config`, `/api/public/agent/vapi`, `/api/public/agent/$tool`, `/api/public/voice/incoming`, `/api/public/voice/turn`, `/api/public/voice/status`, `/mcp`, `/.well-known/oauth-protected-resource`. No auth settings, roles/RLS, mappings, tool schemas, Calendar permissions, secrets or dependency changes.

## Implementation order, after approval only
1. Capture route/action baselines and check existing presentation against this plan.
2. Unify tokens, shared controls, shell, public/account layouts and utility states.
3. Refine onboarding and shared business editors without changing setup behavior.
4. Refine operational records, Calendar, dashboard, analytics and notifications.
5. Refine chat/Web Call last; complete bilingual/mobile/regression checks and report remaining blockers.

## Risks and exact acceptance checks
- **Global styling:** inspect portals/native inputs, token contrast and nested-surface overrides. Check long Japanese names, addresses, identifiers and transcripts. No hidden fields/actions or page overflow.
- **Voice/session safety:** compare effects/refs/client lifetime before and after; no new mount keys, listeners, timers or request paths. Preserve Vapi voice with tenant-bound NAGI brain. A waveform is not proof of speech quality.
- **OAuth safety:** preserve URL handling, origins, timing, permissions and redirects; presentation must not delay the Calendar popup closing.
- **Readiness honesty:** preserve existing status sources; do not visually imply a connected phone, confirmed booking or completed setup from appearance alone. Report unrelated logic defects separately.
- **Static checks:** inspect harness build/typecheck diagnostics; run the existing Vapi protocol/conversation test files and lint after implementation, distinguishing pre-existing failures. Diff against the visual allowlist and confirm all route/API/server/data/secret boundaries remain unchanged.
- **Visual checks:** Playwright all 23 content routes plus 404/error states at 1440×900, 1280×1800, 768×1024 and 390×844 in Japanese and English. Capture screenshots; inspect drawer, tabs, dialogs, complete records, composer, long text, loading/empty/error states, keyboard focus, 200% zoom, reduced motion, touch targets and 4.5:1 normal-text contrast.
- **Nonmutating flows:** verify public/contact links, account validation, editor open/dismiss, Calendar navigation, call-detail expansion, copy actions, language switching and every navigation destination. Account configuration claims require a hosted-settings read, not source inference.
- **Separate explicit authorization for mutating/paid checks:** two-business isolation and sign-out; onboarding resume/Other; temporary business editor and customer/booking CRUD with UI reload/readback; real Calendar connect/select/disconnect; chat confirmation/unavailable-slot/identity-refusal/staff-help; real Web Call start/repeat/cancel/end with transcript/history/notifications/bell readback. Use only approved test records/connections and clean up only those records. Provider usage may cost money.
- **Phone and publishing:** real inbound testing requires a connected line and authorization; otherwise mark unverified. Never change forwarding or publish for verification.

## Review outcome
This plan is grounded in current source inspection, not a new live-flow audit. No backend state, hosted auth settings, real booking, tenant-isolation or real speech behavior is certified by this review. Approval permits only the visual implementation described here; it does not authorize publishing or production-data tests.