# Guided business setup, so NAGI is ready to work

Right now a new business owner lands on a single "shop details" form, and after saving they are dropped into the dashboard while opening hours, services and staff are still empty — which is exactly the data NAGI needs to answer customers. This plan turns the first-run experience into a guided setup, and makes the AI receptionist clearly show when it is ready.

## What the business owner will get

**1. A step-by-step setup flow (first sign-in)**

Five short steps with a progress bar at the top, in Japanese and English:

```text
1 Shop details  →  2 Business type  →  3 Opening hours  →  4 Services  →  5 Staff  →  Done
```

- **Shop details** — the existing form (name, phone, postcode, address, website, timezone).
- **Business type** — hair salon / beauty salon / clinic / dental / massage or spa / studio / other. Picking one preloads editable starter services (name, duration, price) and typical opening hours for that type, so most owners just review and continue.
- **Opening hours** — day-by-day open/closed and times, preloaded, editable.
- **Services** — the starter list, editable: add, rename, change price and duration, remove.
- **Staff** — add team members and tick which services each one does; "just me" adds a single entry using the owner's name.
- Every step can be skipped, and the owner can go back. Nothing is lost: each step saves as it is completed, so closing the browser and returning resumes at the right step.
- Final screen: a short summary ("3 services, 2 staff, open 6 days") with two buttons — "Try NAGI now" and "Go to dashboard".

**2. A setup progress card on the dashboard**

Until every essential piece exists, the dashboard shows a compact card listing what is done and what is left, each item linking straight to the right screen. Once complete, the card disappears and is replaced by a small "NAGI is ready" confirmation.

**3. A clearer AI receptionist page**

- If hours or services are still missing, the chat area shows a friendly readiness panel: what NAGI can already answer, what is missing, and buttons to finish those steps. Chat stays usable, with a notice that answers are limited until the data is filled in.
- When everything is present, the current "live" header stays as it is today.

**4. Small setup helpers**

- The guest account gets the same guided flow, so trying the product shows a working receptionist within a couple of minutes.
- Timezone and currency default sensibly for Japan.

## Not in this plan

No phone or voice agent (that comes later), no redesign of existing screens, no new integrations, no billing.

## Technical notes

- New route `src/routes/_authenticated/onboarding.tsx` becomes a multi-step wizard component (local step state + `?step=` search param for resume), reusing `BusinessForm`, the hours editor extracted from `settings.tsx` into a shared `src/components/business-hours-form.tsx`, and the existing services/staff mutations in `src/lib/api.ts`.
- Business-type starter data lives in a new plain data module `src/lib/business-presets.ts` (bilingual labels, service name/duration/price, default weekly hours). No schema change required for presets; the chosen type is stored as a new nullable `business_type text` column on `businesses` via a migration (with the required GRANT/RLS already covered by existing owner policies).
- A shared `useSetupProgress(businessId)` hook derives completion from existing queries (`useBusinessHours`, `useServices`, `useStaff`) and powers both the dashboard card and the receptionist readiness panel.
- Existing `Navigate to="/onboarding"` guards stay unchanged; the wizard resolves its own resume step from saved data.
- All new copy added to both maps in `src/lib/i18n.tsx`.
- No change to `nagi-brain.server.ts` behaviour; it already refuses to invent data.
