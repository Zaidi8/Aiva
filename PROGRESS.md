# Aiva — Project Progress

_Last audited: 2026-05-23 by audit-project agent._
_Commit at audit time: 1582977_

## 1. Executive summary

The architecture milestone the user set for this phase is largely landed. Auth + multi-tenancy, validation, tenant-scoped helpers, and the full REST surface for Patients / Doctors / Appointments (incl. reschedule + slot availability) / AI Settings / inbound Voice webhooks are all implemented. The Phase 8 voice seams — `Clinic.voicePhone` (unique), `CallLog.clinicId` + `providerCallId` + `updatedAt`, the `WebhookEvent` idempotency table, the shared-secret webhook guard, and three `/api/voice/*` route handlers — are migrated, wired, and verified end-to-end with curl. Overall completeness is roughly **70–75%**: backend foundations are essentially complete; the front-end conversion lags (only Patients is wired to real data so far). The biggest blockers to dropping the AI module in are not architectural — they are storage (recording URLs), realtime push (live call view), and FE wire-up for the Settings → AI tab and Appointments page.

## 2. Tech stack (verified this run)

- **Frontend**: Next.js [16.1.6](package.json#L50), React [19.2.3](package.json#L52), TypeScript [^5](package.json#L72) (strict), Tailwind CSS v4, shadcn/ui (Radix primitives), `sonner` [^2.0.3](package.json#L58), `recharts` [^2.15.2](package.json#L57), `react-hook-form` [^7.55.0](package.json#L55) + `@hookform/resolvers` [^5.2.2](package.json#L12), `zod` [^4.4.2](package.json#L61).
- **Backend**: Next.js Route Handlers + Server Actions, **Prisma** [^6.19.3](package.json#L13), Node.js runtime for all `/api/*` routes.
- **Database / Auth**: Supabase Postgres + Supabase Auth via `@supabase/ssr` [^0.10.2](package.json#L40) and `@supabase/supabase-js` [^2.105.1](package.json#L41).
- **Notable libraries**: `lucide-react`, `date-fns`, `motion`, `recharts`, `class-variance-authority`, `cmdk`, `embla-carousel-react`, `vaul`.

## 3. Data model (Prisma)

Source: [prisma/schema.prisma](prisma/schema.prisma).

| Model | Purpose | Status | Notes |
|---|---|---|---|
| `Clinic` | Tenant root; now carries `voicePhone` (unique) for inbound-call → clinic resolution | done | `voicePhone` [schema.prisma#L113](prisma/schema.prisma#L113); migration [20260523120000](prisma/migrations/20260523120000_add_voice_phone_and_webhook_events/migration.sql#L8) |
| `ClinicStaff` | Dashboard user; FK to Supabase `auth.users` via `authUserId`; soft-delete via `deactivatedAt` | done | [schema.prisma#L136](prisma/schema.prisma#L136) |
| `Patient` | Patient records; `phoneNumber` indexed for voice agent lookup | done | [schema.prisma#L163](prisma/schema.prisma#L163) |
| `Doctor` | Doctors; soft-delete via `deactivatedAt`; deprecated `availableSlots/workingHours` JSON columns retained until `DoctorSchedule` adoption is universal | done | [schema.prisma#L193](prisma/schema.prisma#L193) |
| `Appointment` | DB-level double-booking prevented via `@@unique([doctorId, scheduledAt])` | done | [schema.prisma#L230](prisma/schema.prisma#L230) |
| `CallLog` | Now tenant-keyed (`clinicId` NOT NULL FK CASCADE), `providerCallId` @unique, `updatedAt`, defaulted `outcome/durationSec` | done | [schema.prisma#L268](prisma/schema.prisma#L268); migration [20260523120000](prisma/migrations/20260523120000_add_voice_phone_and_webhook_events/migration.sql#L14) |
| `Notification` | Multi-channel notification log (SMS/Email/Push) | partial | Schema only — no sender, no queue, no API endpoint yet |
| `AiSettings` | 1:1 per-clinic singleton; auto-bootstrapped at register | done | [schema.prisma#L339](prisma/schema.prisma#L339) |
| `DoctorSchedule` | Weekly recurring availability used by `computeAvailability` | done | [schema.prisma#L362](prisma/schema.prisma#L362); used in [queries.ts#L88](lib/appointments/queries.ts#L88) |
| `DoctorTimeOff` | Date-range overrides on top of recurring schedule | done | [schema.prisma#L384](prisma/schema.prisma#L384) |
| `StaffInvitation` | Pending email invitations from admins | partial | Schema only — no acceptance flow, no email, no API |
| `WebhookEvent` | NEW — idempotency log for inbound webhooks (`providerEventId` @unique) | done | [schema.prisma#L436](prisma/schema.prisma#L436); migration [20260523120000](prisma/migrations/20260523120000_add_voice_phone_and_webhook_events/migration.sql#L31) |

Models that **should exist for the AI module** but don't yet:
- A normalized `Transcript` / `CallTurn` table (currently turns are appended to `CallLog.transcript` JSON — works, but harder to query/index by role/text).
- `AuditLog` (deferred — security/compliance follow-up).
- No dedicated recording-storage descriptor (the URL is on `CallLog.recordingUrl` but there is no Supabase Storage bucket / signed-URL helper).

## 4. Frontend status (per route)

| Route | Page component | Data source | Status | Gaps |
|---|---|---|---|---|
| `/auth` | `NewLoginPage` ([page.tsx](app/(auth)/auth/page.tsx)) | server actions | done | Email-confirm flow not surfaced in UI |
| `/dashboard` | `NewDashboardPage` | `mockAppointments` ([NewDashboardPage.tsx#L10](components/pages/NewDashboardPage.tsx#L10)) | partial | Still mock; needs to read from `/api/appointments` summary |
| `/appointments` | `ImprovedAppointmentsPage` | `mockAppointments` ([ImprovedAppointmentsPage.tsx#L16](components/pages/ImprovedAppointmentsPage.tsx#L16)) | partial | Backend complete; FE conversion deferred |
| `/patients` | `NewPatientsPage` | Prisma via server component + `/api/patients` for mutations ([page.tsx](app/(dashboard)/patients/page.tsx)) | done | Verified end-to-end via Playwright |
| `/ai-receptionist` | `NewAIReceptionistPage` | `mockCalls`, `mockNotifications` ([NewAIReceptionistPage.tsx#L36](components/pages/NewAIReceptionistPage.tsx#L36)) | partial | No realtime channel; no read from `lib/calls/queries.ts` |
| `/analytics` | `NewAnalyticsPage` | mock | partial | Needs aggregation queries |
| `/settings` | `NewSettingsPage` (tabbed) | hard-coded defaults in form | partial | AI tab still uses `defaultValue=` inputs; no PATCH to `/api/ai-settings`; no `voicePhone` editor |
| `/ui-kit` | `NewUIKitPage` | static | done | Component showcase only |

## 5. Backend status (per domain)

### Auth
- **Schema**: `ClinicStaff`, `Clinic`, `AiSettings` (created together in register transaction)
- **Reads**: [lib/auth.ts](lib/auth.ts) — `getCurrentStaff`, `requireStaff`, `requireApiStaff`, `requireApiRole`
- **Writes**: [app/(auth)/actions.ts](app/(auth)/actions.ts) — `login`, `register` (transactional), `signout`
- **Validation**: [lib/validations/auth.ts](lib/validations/auth.ts) via `registerSchema`
- **Tenant scoping**: enforced (every staff lookup filters `deactivatedAt: null`)
- **Status**: done
- **Gaps**: No email-confirmation UX; no password reset; no invitation-accept flow

### Clinic
- **Schema**: `Clinic` with `voicePhone @unique`
- **Reads**: indirectly via `getCurrentStaff().clinic` and `getClinicByVoicePhone` ([lib/voice/clinic-resolver.ts](lib/voice/clinic-resolver.ts))
- **Writes**: only via register transaction; no PATCH endpoint
- **Validation**: none on the runtime side (only `registerSchema`)
- **Tenant scoping**: N/A (clinic is itself the tenant root)
- **Status**: partial — missing PATCH endpoint for editing clinic profile (incl. `voicePhone`)
- **Gaps**: No `/api/clinic` route; settings UI cannot edit clinic profile

### Staff / Team
- **Schema**: `ClinicStaff`, `StaffInvitation`
- **Reads/Writes**: no routes
- **Validation**: missing
- **Tenant scoping**: N/A (no endpoints yet)
- **Status**: missing — Phase 6 deferred
- **Gaps**: No invite flow, no roster endpoint, no role-edit UI

### Patients
- **Schema**: `Patient`
- **Reads**: [lib/patients/queries.ts](lib/patients/queries.ts) — `listPatients` (with `q`, pagination), `getPatient`
- **Writes**: [lib/patients/mutations.ts](lib/patients/mutations.ts) — `createPatient`, `updatePatient`, `deletePatient` (hard)
- **Routes**: [app/api/patients/route.ts](app/api/patients/route.ts) + [[id]/route.ts](app/api/patients/[id]/route.ts)
- **Validation**: [lib/validations/patient.ts](lib/validations/patient.ts)
- **Tenant scoping**: enforced via `clinicWhere(staff)` in every helper
- **Status**: done (schema + API + FE)
- **Gaps**: None functional. Soft-delete could be added later for audit trail.

### Doctors
- **Schema**: `Doctor` (+ `DoctorSchedule`, `DoctorTimeOff`)
- **Reads**: [lib/doctors/queries.ts](lib/doctors/queries.ts) — `listDoctors` (filters out deactivated unless `includeDeactivated=true`)
- **Writes**: [lib/doctors/mutations.ts](lib/doctors/mutations.ts) — `createDoctor`, `updateDoctor`, `deactivateDoctor` (soft), `reactivateDoctor`
- **Routes**: [app/api/doctors/route.ts](app/api/doctors/route.ts) + [[id]/route.ts](app/api/doctors/[id]/route.ts)
- **Validation**: [lib/validations/doctor.ts](lib/validations/doctor.ts)
- **Tenant scoping**: enforced
- **Status**: schema + API done; FE deferred
- **Gaps**: No FE page (deferred — will surface as doctor-picker inside Appointments UI). No CRUD for `DoctorSchedule` / `DoctorTimeOff` yet.

### Appointments
- **Schema**: `Appointment` with `@@unique([doctorId, scheduledAt])`
- **Reads**: [lib/appointments/queries.ts](lib/appointments/queries.ts) — `listAppointments`, `getAppointment`, `computeAvailability` (walks `DoctorSchedule` minus `DoctorTimeOff` minus taken slots)
- **Writes**: [lib/appointments/mutations.ts](lib/appointments/mutations.ts) — `createAppointment` (with `AppointmentFkError`), `updateAppointment`, `rescheduleAppointment`, `cancelAppointment` (soft)
- **Routes**: [app/api/appointments/route.ts](app/api/appointments/route.ts), [[id]/route.ts](app/api/appointments/[id]/route.ts), [[id]/reschedule/route.ts](app/api/appointments/[id]/reschedule/route.ts), [app/api/availability/route.ts](app/api/availability/route.ts)
- **Validation**: [lib/validations/appointment.ts](lib/validations/appointment.ts) — create / update / reschedule / availability
- **Tenant scoping**: enforced; cross-clinic patient/doctor IDs raise `AppointmentFkError` -> 422 with field hint ([route.ts#L47](app/api/appointments/route.ts#L47))
- **Status**: schema + API done; FE not wired
- **Gaps**: `ImprovedAppointmentsPage` still uses `mockAppointments`; no UI for reschedule yet

### AI Settings
- **Schema**: `AiSettings` (1:1 with Clinic, `clinicId @unique`)
- **Reads**: [lib/ai-settings/queries.ts](lib/ai-settings/queries.ts) — `getAiSettings`
- **Writes**: [lib/ai-settings/mutations.ts](lib/ai-settings/mutations.ts) — `updateAiSettings` (upsert)
- **Routes**: [app/api/ai-settings/route.ts](app/api/ai-settings/route.ts) — GET auto-bootstraps defaults; PATCH upserts
- **Validation**: [lib/validations/ai-settings.ts](lib/validations/ai-settings.ts)
- **Tenant scoping**: enforced (everything keyed off `staff.clinicId`)
- **Status**: schema + API done; FE not wired (NewSettingsPage AI tab still uses `defaultValue` inputs)
- **Gaps**: FE wire-up; expand schema for voice/persona/business-hours when AI vendor is selected

### Calls (read side for dashboard)
- **Schema**: `CallLog`
- **Reads**: [lib/calls/queries.ts](lib/calls/queries.ts) — `listCalls`, `getCall`
- **Writes**: [lib/calls/mutations.ts](lib/calls/mutations.ts) — `startCall` (upsert by `providerCallId`), `appendTranscriptTurn`, `endCall`
- **Routes**: write path is voice webhooks only (see §7); no dashboard READ endpoint yet
- **Validation**: per-webhook zod in the route files
- **Tenant scoping**: writes use clinic resolved from `voicePhone`; reads spread `clinicWhere(staff)`
- **Status**: schema + write API done; no `/api/calls` dashboard endpoint
- **Gaps**: Dashboard `/api/calls` listing + detail endpoint; AI receptionist FE consumes nothing real

### Voice webhooks (NEW)
- **Schema**: `CallLog` + `WebhookEvent`
- **Routes**: [app/api/voice/incoming-call/route.ts](app/api/voice/incoming-call/route.ts), [transcript-chunk/route.ts](app/api/voice/transcript-chunk/route.ts), [call-ended/route.ts](app/api/voice/call-ended/route.ts)
- **Auth**: shared-secret via [lib/api/with-webhook-secret.ts](lib/api/with-webhook-secret.ts) — `timingSafeEqual`; fail-closed when env unset
- **Idempotency**: [lib/voice/webhook-idempotency.ts](lib/voice/webhook-idempotency.ts) — claim, side-effect, mark processed; retries no-op
- **Tenant resolution**: [lib/voice/clinic-resolver.ts](lib/voice/clinic-resolver.ts) -> `getClinicByVoicePhone(to)`
- **Status**: done; verified with curl (wrong secret -> 401, unknown number -> 404, happy path -> 201, replay -> `duplicate: true`)

### Notifications
- **Schema**: `Notification`
- **Status**: missing — no sender, no provider integration, no API

### Cross-cutting API foundations
- [lib/api/response.ts](lib/api/response.ts) — `ok`, `created`, `noContent`, `fail`, `failValidation`, `failNotFound`, `failConflict`
- [lib/api/with-staff.ts](lib/api/with-staff.ts) — `withApiStaff`, `withApiRole`
- [lib/api/prisma-errors.ts](lib/api/prisma-errors.ts) — `mapPrismaError` (P2002 / P2003 / P2025)
- [lib/api/with-webhook-secret.ts](lib/api/with-webhook-secret.ts) — webhook guard
- [lib/client/fetcher.ts](lib/client/fetcher.ts) — client wrapper + `ApiError`

## 6. Auth & multi-tenancy

- **Login flow**: done. `login()` server action in [actions.ts#L11](app/(auth)/actions.ts#L11), `signInWithPassword`, then `redirect('/dashboard')`.
- **Signup / clinic onboarding**: done. Transactional in [actions.ts#L30](app/(auth)/actions.ts#L30): Supabase `signUp` then Prisma `$transaction` creates `Clinic` + `ClinicStaff(Admin)` + `AiSettings` row.
- **Session reading (server-side)**: done. `getCurrentUser` / `getCurrentStaff` in [lib/auth.ts](lib/auth.ts); `requireStaff` redirects to `/auth`; `requireApiStaff` returns 401 Response.
- **Edge proxy gate** ([proxy.ts](proxy.ts) -> [lib/supabase/proxy.ts](lib/supabase/proxy.ts)): done. `/dashboard/*` blocks unauthenticated; `/auth` redirects authenticated users to `/dashboard`. `/api/*` is explicitly excluded — route handlers self-gate.
- **`ClinicStaff` -> `Clinic` scoping helper** ([lib/clinic-scope.ts](lib/clinic-scope.ts)): done — `clinicWhere(staff)` used in every list/get/update/delete helper across all domains.
- **Sign-out**: done. `signout()` server action in [actions.ts#L112](app/(auth)/actions.ts#L112); used by sidebar form at [NewSidebar.tsx#L317](components/layout/NewSidebar.tsx#L317).
- **Role-based permissions**: partial. `requireApiRole` / `withApiRole` exist but no route currently scopes by role. Every staff member of a clinic can use every endpoint.

## 7. AI-module readiness (CRITICAL)

The voice seams the AI module will plug into are now mostly in place.

| Seam | What's needed | Status | Where it lives / where it should live |
|---|---|---|---|
| Webhook endpoint(s) for voice provider | `/api/voice/incoming-call`, `/transcript-chunk`, `/call-ended` | done | [app/api/voice/*](app/api/voice) |
| `Call` / `Transcript` persistence | `CallLog` row per call, transcript as JSON turns | done | [prisma/schema.prisma#L268](prisma/schema.prisma#L268), [lib/calls/mutations.ts](lib/calls/mutations.ts) |
| Webhook auth | Shared-secret header, timing-safe, fail-closed | done | [lib/api/with-webhook-secret.ts](lib/api/with-webhook-secret.ts) |
| Webhook idempotency | `WebhookEvent` row per `providerEventId`; retry-safe | done | [lib/voice/webhook-idempotency.ts](lib/voice/webhook-idempotency.ts) |
| Inbound number -> clinic resolution | `Clinic.voicePhone @unique` lookup | done | [lib/voice/clinic-resolver.ts](lib/voice/clinic-resolver.ts) |
| Caller phone -> patient lookup | `Patient.phoneNumber` index + list endpoint with `q` | done | [schema.prisma#L183](prisma/schema.prisma#L183), [lib/patients/queries.ts](lib/patients/queries.ts) |
| Slot availability for booking | `GET /api/availability` with `DoctorSchedule` minus `DoctorTimeOff` minus taken slots | done | [app/api/availability/route.ts](app/api/availability/route.ts), [lib/appointments/queries.ts#L88](lib/appointments/queries.ts#L88) |
| Double-booking prevention for AI writes | DB-level `@@unique([doctorId, scheduledAt])` -> 409 | done | [schema.prisma#L253](prisma/schema.prisma#L253) |
| AI settings table (persona, greeting, behavior toggles) | `AiSettings` model + GET endpoint the AI runtime calls per call | done | [schema.prisma#L339](prisma/schema.prisma#L339), [app/api/ai-settings/route.ts](app/api/ai-settings/route.ts) |
| Env / secret management | `.env.example` documents `VOICE_WEBHOOK_SECRET`; `.gitignore` allows `.env.example` through | done | [.env.example#L36](.env.example#L36), [.gitignore#L34](.gitignore#L34) |
| Audio recording storage | Supabase Storage bucket + signed URLs | missing | (Phase 7 — deferred. `CallLog.recordingUrl` field exists but no helper.) |
| Real-time UI updates (live call view) | Supabase Realtime channel or SSE for call/transcript inserts | missing | (Phase 9 — deferred.) |
| Background job runner (post-call summarization, reminders) | Queue / cron | missing | (Deferred.) |
| Outbound notifications (SMS / email confirmation) | Provider client + `Notification` writer | missing | `Notification` model exists; no sender |
| Voice settings beyond the basics (voice id, business hours, scripts) | Extra fields on `AiSettings` once AI vendor is chosen | partial | Current schema has agent name, greeting, four behavior toggles only |
| Clinic `voicePhone` editor | UI / API to set the inbound number per clinic | missing | No PATCH `/api/clinic`; Settings -> Profile tab does not surface `voicePhone` |
| Dashboard read API for calls | `/api/calls` list + detail | missing | `lib/calls/queries.ts` exists but no HTTP layer |

**Ordered prerequisites before the AI module can land cleanly:**
1. Add a clinic-profile PATCH endpoint + Settings UI so admins can set `Clinic.voicePhone` (today it can only be set with raw SQL).
2. Add `/api/calls` (list + detail) and wire the AI receptionist FE to it — needed to verify calls land correctly even before realtime is added.
3. Add Supabase Realtime (or SSE) for `call_log` and `webhook_event` so the live-call view updates in real time.
4. Add a Supabase Storage bucket + signed-URL helper for recordings (`CallLog.recordingUrl`).
5. Implement the notification sender (SMS/email) on top of `Notification` so post-booking confirmations actually go out.
6. Pick the AI vendor and extend `AiSettings` with voice id, business hours, escalation script, etc.

## 8. Cross-cutting

- **Tests**: deferred — out of scope. No Vitest, no Playwright spec files committed; per user direction, manual verification only.
- **Linting / formatting**: ESLint 9 + `eslint-config-next` configured ([eslint.config.mjs](eslint.config.mjs)); `npm run lint`.
- **CI**: deferred — out of scope.
- **Error handling**: centralized via `lib/api/response.ts` + `mapPrismaError`; `AppointmentFkError` for cross-tenant FK violations.
- **Logging**: console-only (e.g. [actions.ts#L101](app/(auth)/actions.ts#L101)). No structured logger.
- **Env management**: `.env.example` documents all keys incl. `VOICE_WEBHOOK_SECRET`; `.gitignore`'s `.env*` rule explicitly allows `.env.example`.
- **Scripts** ([scripts/](scripts)): `db-inspect.mjs`, `db-reactivate.mjs`, `repro-tx.mjs`, `supabase-find-user.mjs`, `supabase-probe.mjs`, `supabase-signout.mjs` — ops only, not app code.
- **Migrations**: 3 applied — `20260504095155_init`, `20260508061122_add_team_management_foundation`, `20260523120000_add_voice_phone_and_webhook_events`.

## 9. Known issues / risks

- The `Doctor.availableSlots` and `Doctor.workingHours` JSON columns are marked DEPRECATED ([schema.prisma#L200](prisma/schema.prisma#L200), [#L202](prisma/schema.prisma#L202)) but still in the schema. Risk of dual-source-of-truth bugs if anything writes to them.
- `proxy.ts` deliberately excludes `/api/*` from session gating ([proxy.ts#L13](proxy.ts#L13)). All `/api/*` handlers MUST call `withApiStaff` / `withApiRole` / `withWebhookSecret`. A future contributor adding an unguarded route would expose tenant data. No CI guard yet.
- `CallLog.transcript` is JSON-blob append (read-modify-write in [mutations.ts#L53](lib/calls/mutations.ts#L53)). Sequential-only safe; parallel chunk delivery from a provider would race. Acceptable for a single voice runtime per call.
- Tenant scoping is convention + code review ([clinic-scope.ts#L20](lib/clinic-scope.ts#L20)) — no Prisma client extension enforcing it. Risk grows as the team scales.
- No rate limiting on `/api/voice/*` — relies entirely on the shared secret.
- Patient `phoneNumber` is not unique-per-clinic; the caller-to-patient lookup will need a deterministic tie-breaker (latest first?) when implemented.
- No `voicePhone` editor anywhere — only DB writes can set the inbound number.

## 10. Recommended next steps (in priority order)

1. **Wire the Appointments FE to the API**. The backend (CRUD, reschedule, availability, double-book protection) is done; `ImprovedAppointmentsPage` still imports `mockAppointments`. This is the highest-leverage UI conversion: it also forces the doctor-picker UI to exist, which the AI module will eventually mirror server-side.
2. **Wire the Settings -> AI tab to `/api/ai-settings`**. Currently the form uses hard-coded `defaultValue` inputs — the AI module reads `/api/ai-settings` on every inbound call, so admins MUST be able to edit it. Bundle a clinic-profile PATCH endpoint + Settings -> Profile editor for `voicePhone` while you're there.
3. **Add Supabase Realtime push for the AI receptionist UI**. With webhooks now writing `CallLog` + `WebhookEvent` rows on every call, the live-call screen can become real if it subscribes to inserts on `call_log` (filtered by `clinicId`) and re-renders. Also expose a `/api/calls` listing endpoint so the page has historical data to render alongside the live feed.
