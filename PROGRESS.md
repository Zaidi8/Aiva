# Aiva — Project Progress

_Last audited: 2026-05-18 by audit-project agent._
_Commit at audit time: `4587ac1` (with substantial uncommitted work — see [git status](#) below)._

## 1. Executive summary

Aiva is roughly **35–40% complete end-to-end**. The **frontend is mature** — every dashboard page is fully designed and interactive (login, dashboard, appointments, patients, AI receptionist, analytics, settings, UI kit) and the **multi-tenant auth/onboarding backend has just landed** ([Supabase Auth + Prisma transactional clinic provisioning](lib/auth.ts), [edge proxy gate](proxy.ts), [`clinicWhere` scoping helper](lib/clinic-scope.ts)). The biggest gap is that **every dashboard page still renders from `data/mockData.ts`** and there are **zero Route Handlers under `app/api/`** — read/write paths to Prisma have not been built. For the AI receptionist, the **data model is ready** ([`CallLog`](prisma/schema.prisma#L262) and [`AiSettings`](prisma/schema.prisma#L322) exist) but **none of the runtime seams** (webhook endpoints, audio storage, real-time push, background jobs, outbound notifications) are wired. The single biggest blocker to AI-module integration is the absence of any API surface — every domain needs CRUD routes and server-rendered reads before a voice provider can call in.

## 2. Tech stack (verified this run)

- **Frontend**: Next.js `16.1.6` (App Router), React `19.2.3`, TypeScript `^5` (strict), Tailwind CSS `^4` (PostCSS), `motion` (animations), `recharts ^2.15.2`, `react-hook-form ^7.55.0`, `zod ^4.4.2`, `sonner ^2.0.3`, `lucide-react ^0.487.0`, shadcn/ui via `@radix-ui/*` + `class-variance-authority ^0.7.1`, `date-fns`, `cmdk`, `vaul`. ([package.json](package.json))
- **Backend**: Next.js Route Handlers + Server Actions (only auth actions exist today — [`app/(auth)/actions.ts`](app/(auth)/actions.ts)), Prisma `^6.19.3` ORM with Postgres (`provider = "postgresql"`).
- **Database / Auth**: Supabase Postgres + Supabase Auth via `@supabase/ssr ^0.10.2` and `@supabase/supabase-js ^2.105.1`. Connection pool through pgbouncer ([`.env.example`](.env.example#L22)).
- **Notable libraries**: `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `input-otp`, `next-themes`, `tailwind-merge`.
- **Missing entirely from deps**: any test runner (no Vitest/Jest/Playwright in `package.json` despite a `.playwright-mcp/` cache dir), no logger, no rate-limit lib, no queue lib, no SMS/email provider SDK, no AI/voice SDK.

## 3. Data model (Prisma)

Source: [prisma/schema.prisma](prisma/schema.prisma). Two applied migrations: [`20260504095155_init`](prisma/migrations/20260504095155_init/migration.sql) and [`20260508061122_add_team_management_foundation`](prisma/migrations/20260508061122_add_team_management_foundation/migration.sql).

| Model | Purpose | Status | Notes |
|---|---|---|---|
| [`Clinic`](prisma/schema.prisma#L103) | Tenant root; holds name/address/phone/email/`timezone` (default `Asia/Karachi`). | ✅ done | Designed as single-row-per-tenant; multi-clinic is "add clinicId FKs later". |
| [`ClinicStaff`](prisma/schema.prisma#L130) | Dashboard user; links Supabase `auth.users.id` via `authUserId`. Has `role`, `jobTitle`, soft-delete `deactivatedAt`. | ✅ done | `getCurrentStaff` filters out deactivated rows. |
| [`Patient`](prisma/schema.prisma#L157) | Patient record (name, age, gender, phone, email, address, `medicalHistory: String[]`). Scoped to clinic. | ✅ schema only | No read/write path — UI uses `mockPatients`. |
| [`Doctor`](prisma/schema.prisma#L187) | Doctor profile with optional `clinicStaffId` link for self-login. `availableSlots` + `workingHours` JSON cols are marked **DEPRECATED** in favor of `DoctorSchedule`/`DoctorTimeOff`. | 🟡 partial | Schema migrated, no API surface, deprecated JSON cols still present. |
| [`Appointment`](prisma/schema.prisma#L224) | `scheduledAt` + `durationMin` + `type` + `status`. **DB-level double-booking prevention** via `@@unique([doctorId, scheduledAt])`. | ✅ schema only | No read/write path; UI uses `mockAppointments`. |
| [`CallLog`](prisma/schema.prisma#L262) | Voice-call record: `patientPhone`, `durationSec`, `detectedIntent`, `outcome`, `transcript: Json`, `sentiment`, `qualityRating`, `recordingUrl`, `startedAt`, `endedAt`. Patient + Appointment FKs both nullable. | 🟡 schema only | Critical AI-module table exists but **no write path, no webhook**, no storage for `recordingUrl`. |
| [`Notification`](prisma/schema.prisma#L295) | Channel-agnostic outbound message log (`SMS` / `Push` / `Email`), status tracked. | 🟡 schema only | No provider client wired; no dispatcher. |
| [`AiSettings`](prisma/schema.prisma#L322) | 1:1 with Clinic. Persona (`agentName`), `greetingMessage`, toggles (`autoBook`, `sendConfirmations`, `handleRescheduling`, `emergencyTransfer`). Seeded by `register` action. | 🟡 partial | Row created on signup, but Settings → AI tab UI ([NewSettingsPage.tsx#L225](components/pages/NewSettingsPage.tsx#L225)) is hard-coded `defaultValue` inputs — does not read or write `AiSettings`. |
| [`DoctorSchedule`](prisma/schema.prisma#L345) | Recurring weekly slots per doctor (`dayOfWeek`, `startTime/endTime`, `slotDurationMinutes`). | 🟡 schema only | No UI, no API. |
| [`DoctorTimeOff`](prisma/schema.prisma#L367) | Date-range overrides (vacation/sick days). | 🟡 schema only | No UI, no API. |
| [`StaffInvitation`](prisma/schema.prisma#L390) | Email + token invite flow with `expiresAt`/`acceptedAt`; unique on `(clinicId, email)`. | 🟡 schema only | No `sendInvite`/`acceptInvite` Server Action, no UI on Settings page, no email send. |

Enums defined: `Gender`, `StaffRole` (`Admin`/`Doctor`/`Receptionist`), `AppointmentType`, `AppointmentStatus`, `CallType`, `CallOutcome`, `CallSentiment`, `NotificationType`, `NotificationStatus`, `NotificationChannel`.

**Models that should exist for the AI module but don't yet:**
- A dedicated `CallEvent` / `CallTurn` table — currently transcripts are stored as opaque `Json` on `CallLog.transcript`. Fine for an MVP but hard to query (e.g. "all turns where intent flipped to escalation").
- A `WebhookEvent` / inbound-event log for idempotency and replay when the voice provider retries.
- A `BackgroundJob` / `Job` queue table (or a Postgres-based queue via `pg_cron` / `pgmq`) — none exists, so post-call summarization/reminders have nowhere to run.
- A `StorageObject` / `Recording` table if recordings need provenance metadata beyond a URL string.
- An `AuditLog` table — none exists, which will become a HIPAA-style problem fast.

## 4. Frontend status (per route)

All `(dashboard)/*/page.tsx` files are thin client wrappers; real UI lives in `components/pages/New*.tsx`. None of them perform server-side data fetching today — they all render mock data on the client.

| Route | Page component | Data source | Status | Gaps |
|---|---|---|---|---|
| `/` | [`app/page.tsx`](app/page.tsx) | n/a | ✅ done | Redirects to `/auth`. |
| `/auth` | [`NewLoginPage`](components/pages/NewLoginPage.tsx) via [`app/(auth)/auth/page.tsx`](app/(auth)/auth/page.tsx) | Server Actions `login`/`register` | ✅ done | Combined login + clinic registration in one component. |
| `/dashboard` | [`NewDashboardPage`](components/pages/NewDashboardPage.tsx) | `mockAppointments` ([line 10](components/pages/NewDashboardPage.tsx#L10)) | 🟡 UI only | Stats are literal numbers (`value: 24`); no Prisma reads. |
| `/appointments` | [`ImprovedAppointmentsPage`](components/pages/ImprovedAppointmentsPage.tsx) | `mockAppointments` ([line 19](components/pages/ImprovedAppointmentsPage.tsx#L19)) | 🟡 UI only | Note: the route uses `Improved*`, not `New*` — exception to the convention. Modals (`NewAppointmentModal`, `AppointmentDetailsModal`) don't persist. |
| `/patients` | [`NewPatientsPage`](components/pages/NewPatientsPage.tsx) | `mockPatients` ([line 16](components/pages/NewPatientsPage.tsx#L16)) | 🟡 UI only | `AddPatientModal`/`PatientRecordModal` don't persist. |
| `/ai-receptionist` | [`NewAIReceptionistPage`](components/pages/NewAIReceptionistPage.tsx) | `mockCalls`, `mockNotifications` ([line 36](components/pages/NewAIReceptionistPage.tsx#L36)) | 🟡 UI only | Renders call list, transcript pane, sentiment, recording playback affordance — all fake. The page that drives the entire product story has no live wire-up. |
| `/analytics` | [`NewAnalyticsPage`](components/pages/NewAnalyticsPage.tsx) | Inline hard-coded arrays (`appointmentData`, etc.) at [line 24](components/pages/NewAnalyticsPage.tsx#L24) | 🟡 UI only | Recharts dashboards with literal arrays; no query layer. |
| `/settings` | [`NewSettingsPage`](components/pages/NewSettingsPage.tsx) | None — all `defaultValue=""` | 🟡 UI only | 5 tabs (`profile`, `notifications`, `security`, `ai`, `appearance`); save button is `toast.success(...)` placeholder ([line 27](components/pages/NewSettingsPage.tsx#L27)). |
| `/ui-kit` | [`NewUIKitPage`](components/pages/NewUIKitPage.tsx) | n/a | ✅ done | Component showcase; not user-facing. |

Legacy unused page components present in `components/pages/`: `LoginPage.tsx`, `AIReceptionistPage.tsx`, `AnalyticsPage.tsx`, `AppointmentsPage.tsx`, `DashboardPage.tsx`, `PatientsPage.tsx`, `SettingsPage.tsx`, `UIKitPage.tsx`, `NotificationsPage.tsx`. Per convention these are not active — only `New*` (and `Improved*` for appointments) are reachable.

## 5. Backend status (per domain)

### Auth
- **Schema**: Supabase `auth.users` (managed by Supabase, not Prisma) ↔ [`ClinicStaff.authUserId`](prisma/schema.prisma#L132).
- **Reads**: [`getCurrentUser`/`getCurrentStaff`/`requireStaff`/`requireRole`](lib/auth.ts) for SC/SA; [`requireApiStaff`/`requireApiRole`](lib/auth.ts#L80) for Route Handlers.
- **Writes**: [`login`](app/(auth)/actions.ts#L11), [`register`](app/(auth)/actions.ts#L30), [`signout`](app/(auth)/actions.ts#L112) (Server Actions).
- **Validation**: [`lib/validations/auth.ts`](lib/validations/auth.ts) — `registerSchema` with email/password/clinic fields.
- **Tenant scoping**: ✅ — proxy + `getCurrentStaff` provides the staff→clinic link.
- **Status**: ✅ done.
- **Gaps**: No email-verification gating UI (Supabase may require email confirmation; current `register` does `redirect("/dashboard")` even when `authData.user` exists without confirmed email). No password-reset flow. No "resend invitation" / "accept invitation" routes wired despite `StaffInvitation` model existing.

### Clinic
- **Schema**: [`Clinic`](prisma/schema.prisma#L103).
- **Reads**: Read indirectly via `getCurrentStaff().clinic` — no settings-page query.
- **Writes**: Created inside the `register` transaction ([app/(auth)/actions.ts#L77](app/(auth)/actions.ts#L77)); no update path.
- **Validation**: Partial (only at registration via `registerSchema`).
- **Tenant scoping**: ✅ (clinic is the tenant boundary).
- **Status**: 🟡 partial.
- **Gaps**: Settings → Profile/Clinic tab does not persist (`handleSave` is just a toast). No clinic-update Server Action.

### Staff / Team
- **Schema**: [`ClinicStaff`](prisma/schema.prisma#L130), [`StaffInvitation`](prisma/schema.prisma#L390).
- **Reads**: Only the current staff via `getCurrentStaff`. No team-list query.
- **Writes**: Only `register` creates the initial Admin row.
- **Validation**: Missing for invitation/team management.
- **Tenant scoping**: N/A yet (no list endpoint).
- **Status**: 🟡 partial — schema migrated, no UI/API.
- **Gaps**: No "Team" tab in Settings. No invite-send Server Action. No invite-accept route. No deactivate/reactivate UI (despite `deactivatedAt` column and [`scripts/db-reactivate.mjs`](scripts/db-reactivate.mjs) existing as ops escape hatch).

### Patients
- **Schema**: [`Patient`](prisma/schema.prisma#L157).
- **Reads**: ❌ missing.
- **Writes**: ❌ missing (`AddPatientModal` is UI-only).
- **Validation**: ❌ missing (no `lib/validations/patient.ts`).
- **Tenant scoping**: N/A (no queries yet).
- **Status**: ❌ missing (schema only).
- **Gaps**: Everything except the schema. Need list/create/update/delete + zod schema.

### Appointments
- **Schema**: [`Appointment`](prisma/schema.prisma#L224), plus `DoctorSchedule`/`DoctorTimeOff` to compute availability.
- **Reads**: ❌ missing.
- **Writes**: ❌ missing.
- **Validation**: ❌ missing.
- **Tenant scoping**: N/A.
- **Status**: ❌ missing (schema only).
- **Gaps**: All CRUD. Calendar view, slot-availability calculation, double-book handling (DB unique constraint will throw — needs friendly mapping to a 409 in the route). This is the table the AI receptionist will write to — it must land first.

### AI Settings
- **Schema**: [`AiSettings`](prisma/schema.prisma#L322).
- **Reads**: ❌ missing (Settings page uses hard-coded defaults).
- **Writes**: Created at signup only ([app/(auth)/actions.ts#L98](app/(auth)/actions.ts#L98)); no update path.
- **Validation**: ❌ missing.
- **Tenant scoping**: N/A (1:1 with clinic).
- **Status**: 🟡 partial (row exists, UI doesn't talk to it).
- **Gaps**: Read on `/settings?tab=ai` load; update Server Action; zod schema.

### Analytics
- **Schema**: Aggregates over `Appointment`, `CallLog`, `Notification`.
- **Reads**: ❌ missing (all charts use literal arrays).
- **Writes**: N/A.
- **Validation**: N/A.
- **Tenant scoping**: N/A.
- **Status**: ❌ missing.
- **Gaps**: Server Component to compute aggregates per clinic. Depends on real Appointment + CallLog data existing.

## 6. Auth & multi-tenancy

- **Login flow**: ✅ — [Server Action `login`](app/(auth)/actions.ts#L11) uses `signInWithPassword`, redirects to `/dashboard`; client form in [`NewLoginPage`](components/pages/NewLoginPage.tsx) with `useTransition` + sonner error toasts.
- **Signup / clinic onboarding**: ✅ — [`register`](app/(auth)/actions.ts#L30) uses zod, then `prisma.$transaction` creates `Clinic` + `ClinicStaff` (`role: Admin`) + `AiSettings` atomically. Comments explicitly note timezone defaults to `Asia/Karachi`. There is a [`scripts/repro-tx.mjs`](scripts/repro-tx.mjs) confirming this provisioning flow is being actively hardened.
- **Session reading (server-side)**: ✅ — [`getCurrentStaff`](lib/auth.ts#L38) uses `supabase.auth.getUser()` (JWT-verified, not just cookie-presence) and filters out soft-deleted staff.
- **Edge proxy gate (`proxy.ts`)**: ✅ — [`proxy.ts`](proxy.ts) at repo root delegates to [`lib/supabase/proxy.ts`](lib/supabase/proxy.ts). Gates `/dashboard/*` for unauthenticated users (redirects to `/auth?redirectedFrom=...`) and bounces authenticated users away from `/auth`. Cookie sync between `request.cookies` and the response is correctly handled per Supabase SSR docs. The matcher excludes `api/*` so route handlers will manage their own auth (none exist yet).
- **ClinicStaff → Clinic scoping helper (`lib/clinic-scope.ts`)**: ✅ — [`clinicWhere(staff)`](lib/clinic-scope.ts#L29) returns `{ clinicId: staff.clinicId }` to be spread into every Prisma `where`. The file has an excellent commented threat model and a `findUnique` vs `findFirst` warning. **Convention-only** — no Prisma extension enforces it. Has a `TODO` flagging the need to audit `app/api/**` against the rule once routes land.
- **Sign-out**: ✅ — [`signout`](app/(auth)/actions.ts#L112) Server Action, invoked via `<form action={signout}>` in [NewSidebar.tsx#L317](components/layout/NewSidebar.tsx#L317).
- **Role-based permissions**: 🟡 — `requireRole(allowedRoles)` exists in [lib/auth.ts#L59](lib/auth.ts#L59), but no caller uses it yet. UI does not branch on `staff.role`.

## 7. AI-module readiness (CRITICAL)

| Seam | What's needed | Status | Where it lives / should live |
|---|---|---|---|
| Webhook endpoint(s) for voice provider | One or more route handlers under `app/api/voice/*` (or `app/api/calls/*`) to receive provider callbacks (call-started / transcript-chunk / call-ended) and persist them. | ❌ | No `app/api/` directory exists. |
| Call / Transcript / CallEvent Prisma models | Persist every call and its turns. | 🟡 | `CallLog` exists with `transcript: Json` ([prisma/schema.prisma#L262](prisma/schema.prisma#L262)) but no per-turn `CallEvent` table; no inbound-event/idempotency table. |
| Audio recording storage | Supabase Storage bucket + signed-URL helper. | ❌ | `CallLog.recordingUrl` column exists but no `lib/storage/*`; no bucket policy in repo. |
| AI settings table (persona, voice, hours, scripts) | `AiSettings` model + UI that reads/writes it. | 🟡 | Model exists and is seeded by `register`. Settings → AI tab UI ([components/pages/NewSettingsPage.tsx#L225](components/pages/NewSettingsPage.tsx#L225)) is static — does not read or persist. |
| Real-time UI updates (live call view) | SSE route or Supabase Realtime subscription on `call_log`. | ❌ | No `EventSource`/SSE/Realtime usage anywhere in `lib/`, `app/`, `components/`. |
| Background job runner (post-call summary, reminders) | Queue/cron infra (e.g. `pg_cron`, `pgmq`, Inngest, Trigger.dev). | ❌ | Nothing present. Scripts under `scripts/*.mjs` are manual ops only. |
| Env vars / secret management | `.env.example` documenting all keys. | 🟡 | [`.env.example`](.env.example) documents Supabase + Prisma vars; no voice-provider / AI-service / SMS / email keys yet (intentionally TBD). |
| Outbound notifications (SMS/email) | Provider SDK + dispatcher reading from `Notification` table. | ❌ | `Notification` model exists; no provider client, no dispatcher, no SDK in `package.json`. |
| Phone-number → Patient lookup helper | Function to resolve a caller `patientPhone` to a `Patient` (or create a stub). | ❌ | `Patient.phoneNumber` is indexed ([prisma/schema.prisma#L177](prisma/schema.prisma#L177)) for exactly this purpose, but no helper exists. |
| Slot-availability query | Given `(doctorId, dateRange)`, compute bookable slots from `DoctorSchedule`/`DoctorTimeOff` minus existing `Appointment` rows. | ❌ | Schema ready, query not written. |
| Audit / event log of AI actions | Track every AI-initiated booking/cancellation for compliance. | ❌ | No `AuditLog` model. |

**Ordered prerequisites before the AI module can land cleanly:**

1. **Build the appointment read/write API + slot-availability query.** The AI receptionist's headline use case is "book an appointment over the phone" — there is currently nowhere to write that booking. Must land Patient CRUD, Doctor CRUD (incl. `DoctorSchedule`/`DoctorTimeOff` editor), and Appointment CRUD with the DB `doctor_slot_unique` constraint mapped to a 409 response.
2. **Wire the Settings → AI tab to `AiSettings`** so persona/greeting/auto-book toggles are real config the voice runtime can read on every call.
3. **Add Supabase Storage helper + recordings bucket** (private bucket, signed-URL on demand) so `CallLog.recordingUrl` is meaningful.
4. **Add `app/api/voice/*` route handlers** behind a shared-secret header check (since the matcher in [proxy.ts](proxy.ts#L13) deliberately excludes `/api/`). Persist into `CallLog` + create/update `Appointment` rows scoped by the clinic the inbound number maps to (need a `clinic.phone` → `clinicId` lookup).
5. **Decide call-event modelling**: keep `transcript: Json` for the MVP or normalize into a `CallEvent` table; either way add an inbound-event/idempotency table so provider retries don't double-book.
6. **Add a job runner** (Postgres-based or external) for post-call summary, reminders, and the dispatcher reading from `Notification`.
7. **Add Supabase Realtime or SSE** to push live transcript chunks into `NewAIReceptionistPage` so the existing UI becomes truthful.
8. **Tenant resolution for inbound calls**: a single voice number maps to one clinic. Either add `Clinic.voicePhone` (distinct from staff contact phone) with a unique constraint, or a `PhoneNumber` lookup table — currently no field is unique on `Clinic.phone`.

## 8. Cross-cutting

- **Tests**: ❌ — no test runner installed, no `__tests__` / `tests` dirs, no `*.test.ts` files. The `.playwright-mcp/` cache dir exists from the playwright MCP server but no committed Playwright config.
- **Linting / formatting**: 🟡 — `next lint` via [eslint.config.mjs](eslint.config.mjs) with `eslint-config-next` only. No Prettier config in repo. No formatting hook.
- **CI**: ❌ — no `.github/` directory; no other CI config.
- **Error handling & logging**: 🟡 — auth helpers throw `NotAuthorizedError`; `register` action `console.error`s on transaction failure. No structured logger (`pino`/`winston`) and no error monitoring (Sentry).
- **Env management**: ✅ baseline — [`.env.example`](.env.example) is thorough for the current scope (Supabase URL/publishable/secret + Prisma `DATABASE_URL`/`DIRECT_URL` with pgbouncer hint). Will need expansion when the AI module lands.
- **Rate limiting**: ❌ — none on the auth Server Actions; brute-force protection relies entirely on Supabase.
- **Scripts (`scripts/*.mjs`)**: ops/repro scripts only — [`db-inspect.mjs`](scripts/db-inspect.mjs) (read-only clinic/staff inspection), [`db-reactivate.mjs`](scripts/db-reactivate.mjs) (un-soft-delete staff by email), [`repro-tx.mjs`](scripts/repro-tx.mjs) (reproduces the signup transaction in isolation — clearly used to debug provisioning), [`supabase-find-user.mjs`](scripts/supabase-find-user.mjs), [`supabase-probe.mjs`](scripts/supabase-probe.mjs), [`supabase-signout.mjs`](scripts/supabase-signout.mjs). Not product features.
- **Tracked but uncommitted (substantial work-in-progress)**: deleted `app/(auth)/login/page.tsx` and added [`app/(auth)/auth/page.tsx`](app/(auth)/auth/page.tsx) (route rename `/login` → `/auth`), modified [`app/(dashboard)/layout.tsx`](app/(dashboard)/layout.tsx) and [`prisma/schema.prisma`](prisma/schema.prisma), added all of [`lib/auth.ts`](lib/auth.ts), [`lib/clinic-scope.ts`](lib/clinic-scope.ts), [`lib/supabase/`](lib/supabase/), [`lib/validations/`](lib/validations/), [`app/(auth)/actions.ts`](app/(auth)/actions.ts), [`app/(dashboard)/_components/DashboardShell.tsx`](app/(dashboard)/_components/DashboardShell.tsx), [`proxy.ts`](proxy.ts), the `add_team_management_foundation` migration, and all of [`scripts/`](scripts/). **All of this is real, working code that hasn't been committed yet.**

## 9. Known issues / risks

- **Convention-only tenant scoping**: [`lib/clinic-scope.ts`](lib/clinic-scope.ts) is enforced by code review, not by types or a Prisma extension. The first list endpoint that forgets `clinicWhere(staff)` leaks data across clinics. The file's own TODO acknowledges this.
- **Email-confirmation gap**: [`register`](app/(auth)/actions.ts#L30) creates the clinic and redirects to `/dashboard` whenever `authData.user` is non-null, even when Supabase requires email confirmation. If confirmation is enforced server-side, the user lands on `/dashboard`, `proxy.ts` doesn't have a session, and they get bounced back to `/auth` with no message.
- **Deprecated Doctor columns still in schema**: `Doctor.availableSlots` and `Doctor.workingHours` (Json) are marked DEPRECATED ([prisma/schema.prisma#L194-L196](prisma/schema.prisma#L194)) but not yet dropped — risk of two sources of truth for availability the moment a developer reads one and writes the other.
- **Improved vs New naming exception**: `/appointments` routes to `ImprovedAppointmentsPage` ([app/(dashboard)/appointments/page.tsx](app/(dashboard)/appointments/page.tsx#L3)), breaking the "always `New*`" convention documented in [CLAUDE.md](CLAUDE.md). `NewAppointmentsPage.tsx` exists but is unused.
- **Mock-data drift**: [`data/mockData.ts`](data/mockData.ts) defines its own `CallRecording`/`Appointment`/`Patient` types that do not match the Prisma models (e.g. `CallRecording.transcript` is a typed array, but `CallLog.transcript` is `Json`). Migrating the UI to Prisma will require mapping or rewriting types.
- **`AiSettings` row uniqueness on register**: `register` calls `tx.aiSettings.create({ data: { clinicId: clinic.id } })` inside the transaction. If a clinic somehow gets two register attempts mid-flight (race in Supabase Auth then Prisma), the unique constraint on `clinicId` will throw — current code returns a generic `"Account created but clinic setup failed"` and leaves the auth user orphaned.
- **No `.env.example` entry for the AI / voice / notification stack**: every key needed to integrate the AI module is undocumented, making onboarding for that work cold-start.
- **No rate limiting on `login`/`register`** Server Actions — relies entirely on Supabase Auth defaults.
- **`register-form-empty.png`** at repo root is an untracked screenshot likely from manual QA — should move to a `docs/` folder or be removed.

## 10. Recommended next steps (in priority order)

1. **Commit the auth + onboarding work.** Massive amount of working code is unstaged (`lib/auth.ts`, `lib/clinic-scope.ts`, `lib/supabase/*`, `lib/validations/*`, `app/(auth)/actions.ts`, `proxy.ts`, the `add_team_management_foundation` migration, `DashboardShell`, scripts). Land it as one or two reviewable commits before continuing.
2. **Patients CRUD** as the warm-up domain — simplest single-clinic-scoped resource. Build: `app/api/patients/route.ts` (GET list, POST create) + `app/api/patients/[id]/route.ts` (GET/PATCH/DELETE) + `lib/validations/patient.ts` + replace `mockPatients` in `NewPatientsPage`. Use [`clinicWhere(staff)`](lib/clinic-scope.ts#L29) in every query. Establishes the pattern for everything downstream.
3. **Doctors + DoctorSchedule + DoctorTimeOff CRUD.** Required before appointments can be booked. Drop the deprecated `availableSlots`/`workingHours` JSON columns in a follow-up migration after the new tables are in use.
4. **Appointments CRUD + slot-availability query.** Map the `doctor_slot_unique` constraint violation to HTTP 409 with a friendly error. Replace `mockAppointments` in `NewDashboardPage` and `ImprovedAppointmentsPage`.
5. **Wire Settings → AI tab to `AiSettings`** (read + update Server Action). This is the contract the AI module reads on every inbound call.
6. **Team management UI** (Settings → Team tab) backed by `StaffInvitation` + an invite-send Server Action + an invite-accept route under `app/(auth)/invite/[token]/`.
7. **Storage helper + recordings bucket** in `lib/storage/`. Private bucket, signed URLs minted by a server-only helper.
8. **`app/api/voice/*` webhook endpoints** with shared-secret header verification, idempotency by event ID, writing into `CallLog` + (optionally) creating `Appointment` rows. Add a `Clinic.voicePhone` unique field so we can resolve which clinic an inbound call belongs to.
9. **Real-time channel** (Supabase Realtime on `call_log` is the path of least resistance; we already have `@supabase/supabase-js`). Replace `mockCalls` in `NewAIReceptionistPage` with a Realtime subscription.
10. **Tests + CI.** At minimum: Vitest for `lib/clinic-scope.ts` and the registration transaction (the scoping rule and the auth flow are the two places a regression silently destroys production). Add a `.github/workflows/ci.yml` running `npm run lint && npx prisma validate && npm run build`.
11. **Address the convention-only scoping risk** by introducing a Prisma client extension that injects `clinicId` into clinic-owned models automatically — once we have 2+ list endpoints in production it's no longer safe to rely on review.
12. **Pick voice + AI vendors** (out of scope for this audit) and add the corresponding env keys to `.env.example`.
