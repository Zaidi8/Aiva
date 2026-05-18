# Aiva — Finish-the-Architecture Design

_Date: 2026-05-18_
_Status: Approved — proceeding to implementation plan_
_Source audit: [PROGRESS.md](../../../PROGRESS.md)_

## Goal

Complete the FE + BE + API + DB work so the Aiva architecture is ready to receive the AI receptionist module. The AI vendor itself is **out of scope** — this spec lands every integration seam the module will need.

## Scope

**In scope** (10 phases, audit order):

1. Commit the unstaged auth/onboarding baseline.
2. Patients CRUD.
3. Doctors + DoctorSchedule + DoctorTimeOff CRUD; drop deprecated `Doctor.availableSlots` / `Doctor.workingHours` JSON cols.
4. Appointments CRUD + slot-availability query; map `doctor_slot_unique` → HTTP 409.
5. AI Settings wiring (Settings → AI tab reads/writes `AiSettings`).
6. Team management (Settings → Team tab + invite send/accept).
7. Storage helper (`lib/storage/`, private recordings bucket, signed URLs).
8. Voice webhooks (`app/api/voice/*` + `Clinic.voicePhone` unique field + idempotency table).
9. Realtime channel (Supabase Realtime on `call_log` replaces `mockCalls`).
10. Tests + CI (Vitest critical paths, Playwright happy paths, GitHub Actions workflow).

**Out of scope** (deferred follow-ups):

- AI / voice vendor selection and the runtime that calls the webhooks.
- Background job runner (post-call summarization, reminder dispatcher).
- `AuditLog` table.
- Prisma client extension that enforces `clinicWhere` at the type level. (We'll rely on convention + tests + code review for now.)
- Dropping the legacy non-`New*` page components — left in place to keep diffs small.
- Password reset and email-verification UX polish.
- Rate limiting on auth Server Actions.

## Architecture conventions (built once, used everywhere)

These land before Phase 2 begins and every subsequent phase obeys them.

### API response shape

Every Route Handler returns one of:

```ts
type ApiOk<T>   = { data: T };
type ApiFail    = { error: { code: string; message: string; fields?: Record<string, string[]> } };
```

Helpers in [lib/api/response.ts](../../../lib/api/response.ts) (to be created):

- `ok<T>(data: T, init?: ResponseInit)` — `200`
- `created<T>(data: T)` — `201`
- `noContent()` — `204`
- `fail(code, message, status, fields?)` — generic error
- `failValidation(zodError)` — `422`, populates `fields`
- `failNotFound(resource)` — `404`
- `failConflict(message)` — `409`
- `failUnauthorized()` — `401`
- `failForbidden()` — `403`

### Auth wrappers for route handlers

[lib/api/with-staff.ts](../../../lib/api/with-staff.ts) (to be created):

```ts
withApiStaff(handler: (req, ctx, staff) => Promise<Response>): RouteHandler
withApiRole(roles: StaffRole[]): (handler) => RouteHandler
```

Both build on the existing `requireApiStaff` / `requireApiRole` in [lib/auth.ts](../../../lib/auth.ts) and convert `NotAuthorizedError` → `401`/`403` using the response helpers above.

### Tenant-scoped query/mutation helpers

Each domain owns two files:

- `lib/<domain>/queries.ts` — read-side helpers (`listPatients(staff, opts)`, `getPatient(staff, id)`)
- `lib/<domain>/mutations.ts` — write-side helpers (`createPatient(staff, input)`, `updatePatient(staff, id, input)`)

**Rule (enforced by code review and tests):** every helper takes `staff` as its first argument and spreads `clinicWhere(staff)` into the Prisma `where` clause. Route handlers **must not** call `prisma.x.*` directly — they call helpers.

### Prisma error mapping

[lib/api/prisma-errors.ts](../../../lib/api/prisma-errors.ts) (to be created):

`mapPrismaError(e: unknown): Response | null` — recognizes:

- `P2002` (unique constraint) → `409` with the violated target in the message
- `P2003` (FK violation) → `422`
- `P2025` (record not found) → `404`
- Anything else → `null` (caller rethrows / 500s)

### Validation pattern

Every domain has `lib/validations/<domain>.ts` exporting:

- `create<Domain>Schema` — required fields for creation
- `update<Domain>Schema` — `create<Domain>Schema.partial()` plus any extra rules
- `<Domain>Input` and `<Domain>UpdateInput` types via `z.infer`

Route handlers `.safeParse(body)` and call `failValidation(result.error)` on failure.

### Client data layer

[lib/client/fetcher.ts](../../../lib/client/fetcher.ts) (to be created) — a 30-line typed `fetch` wrapper:

```ts
apiGet<T>(path): Promise<T>
apiPost<T>(path, body): Promise<T>
apiPatch<T>(path, body): Promise<T>
apiDelete(path): Promise<void>
```

Throws `ApiError` with `{ code, message, fields }` on `!ok`. Client components catch and toast.

No SWR / react-query dependency. For reads we prefer **server components** doing the fetch directly via the query helper (no API round-trip for in-app reads). The `app/api/*` routes exist for: (a) writes from client forms, (b) the upcoming AI module, (c) any external integration. Where a list needs to refresh client-side after a mutation, we use `router.refresh()` from `next/navigation`.

### Conventional commit messages

Every phase commits in small reviewable chunks with conventional prefixes: `feat(patients): …`, `fix(appointments): …`, `chore(prisma): …`, `test(appointments): …`, `docs(progress): …`.

## Layer-specialist agents

Four implementer agents, plus the existing `audit-project`. Each agent owns one layer across every phase.

### `aiva-prisma-engineer`

- **Owns**: `prisma/schema.prisma`, `prisma/migrations/`, seed scripts, `lib/<domain>/queries.ts`, `lib/<domain>/mutations.ts`.
- **Knows**: tenant-scoping rule (`clinicWhere(staff)`), soft-delete convention (`deactivatedAt`), the `doctor_slot_unique` DB constraint, the Supabase `auth.users` ↔ `ClinicStaff.authUserId` link, the deprecated `Doctor.availableSlots`/`workingHours` columns to drop in Phase 3.
- **Does**: schema changes, migrations, typed query/mutation helpers.
- **Returns**: file paths + a one-paragraph "what changed in schema" note.
- **Does NOT**: write API routes, touch React.

### `aiva-api-engineer`

- **Owns**: `app/api/**/route.ts`, `lib/validations/*`, `lib/api/*`, server actions for form submissions that don't need a separate route (e.g. settings save).
- **Knows**: the response-shape convention, `withApiStaff`/`withApiRole`, zod, `mapPrismaError`, the proxy carve-out (`/api/*` is excluded from the edge proxy — handlers enforce their own auth).
- **Does**: zod schemas, route handlers, error mapping; calls the prisma-engineer's helpers.
- **Returns**: route table + a curl example per endpoint.
- **Does NOT**: touch schema files, touch React.

### `aiva-fe-engineer`

- **Owns**: `components/pages/New*.tsx`, replacement of `data/mockData.ts` reads, form components, `lib/client/fetcher.ts`, per-domain client hooks if needed.
- **Knows**: the `New*` convention, the `Improved*` exception for appointments, sonner toast usage, react-hook-form + zod resolver, the existing shadcn/ui inventory.
- **Does**: swap mock arrays for live data (preferring server components for reads), wire forms to API endpoints, surface API errors as toasts, loading/empty/error states.
- **Returns**: per-route status (which mock arrays remain).
- **Does NOT**: touch schema, touch route handlers.

### `aiva-test-engineer`

- **Owns**: `vitest.config.ts`, `playwright.config.ts`, `__tests__/`, `e2e/`, `.github/workflows/ci.yml`, test fixtures, test database setup.
- **Knows**: Vitest 2.x patterns, Playwright on Next.js, Supabase test-user lifecycle (model after `scripts/supabase-*.mjs`), how to start the dev server for E2E, how to roll back the Prisma test DB between runs.
- **Does**: install runners, write critical-path tests per phase, set up CI.
- **Returns**: test inventory + run instructions.
- **Does NOT**: implement features.

### `audit-project` (existing)

Runs at the end of each phase to refresh `PROGRESS.md`.

## Per-phase workflow

1. **Phase spec** — I write a one-page phase spec at `docs/superpowers/specs/phase-<N>-<name>.md` listing: schema deltas, routes, UI screens, tests, acceptance criteria.
2. **Dispatch within phase** — agents run **sequentially** inside a phase (schema → API → FE → tests). Across phases, once Patients (Phase 2) establishes the pattern, **Doctors (3) and AI Settings (5) may run in parallel** (no shared schema or routes). Appointments (4) waits for Doctors. Phases 6–10 are sequential.
3. **Small commits** — each agent commits its slice with a conventional commit message.
4. **Checkpoint cadence** — agreed with user: **chain Phases 2–5** (CRUD-heavy, low risk), checkpoint with user before Phase 6+. The `audit-project` agent refreshes `PROGRESS.md` after every phase regardless.

## Phase details

### Phase 1 — Commit baseline (no agent; I do this)

- Two commits:
  - `feat(auth): supabase auth + transactional clinic onboarding` — `lib/auth.ts`, `lib/supabase/*`, `lib/clinic-scope.ts`, `lib/validations/auth.ts`, `app/(auth)/actions.ts`, `app/(auth)/auth/page.tsx`, `app/(auth)/login/page.tsx` (deletion), `app/(dashboard)/layout.tsx`, `app/(dashboard)/_components/DashboardShell.tsx`, `proxy.ts`, `prisma/schema.prisma` deltas, `prisma/migrations/20260508061122_add_team_management_foundation/`, `components/layout/NewSidebar.tsx`, `components/pages/NewLoginPage.tsx`.
  - `chore(scripts): supabase + prisma ops scripts` — everything under `scripts/`.
- `register-form-empty.png` is moved to `docs/qa/` (or removed if you prefer).
- `.mcp.json` is left untracked (per `.gitignore` if listed; otherwise add to `.gitignore`).

### Phase 2 — Patients CRUD (pattern-setter)

**Schema**: none (Patient model already exists).

**Routes**:

- `GET  /api/patients` — list (paginated, optional `q` search on name/phone)
- `POST /api/patients` — create
- `GET  /api/patients/[id]` — read
- `PATCH /api/patients/[id]` — update
- `DELETE /api/patients/[id]` — soft delete via a new `deletedAt` column? **Decision**: hard delete for MVP; if compliance needs surface later, add `deletedAt` then.

**Validation**: `lib/validations/patient.ts` — `createPatientSchema`, `updatePatientSchema`. Required: `name`, `phoneNumber`. Optional: `age`, `gender`, `email`, `address`, `medicalHistory[]`.

**Query helpers**: `lib/patients/queries.ts`, `lib/patients/mutations.ts`.

**FE**: [components/pages/NewPatientsPage.tsx](../../../components/pages/NewPatientsPage.tsx) reads via server component; `AddPatientModal` and `PatientRecordModal` post via `apiPost` / `apiPatch`; on success → `router.refresh()` + toast.

**Tests**:

- Vitest: `lib/patients/mutations.test.ts` — create scoped to `clinicId`; tenant leak test (clinic A cannot read clinic B's patient).
- Playwright: `e2e/patients.spec.ts` — login → add patient → see in list → open record.

### Phase 3 — Doctors + Schedules + TimeOff

**Schema**:

- Drop deprecated `Doctor.availableSlots`, `Doctor.workingHours` (migration `drop_deprecated_doctor_cols`).
- No new tables (DoctorSchedule, DoctorTimeOff already exist).

**Routes**:

- `GET/POST /api/doctors`, `GET/PATCH/DELETE /api/doctors/[id]`
- `GET/POST /api/doctors/[id]/schedules`, `PATCH/DELETE /api/doctors/[id]/schedules/[scheduleId]`
- `GET/POST /api/doctors/[id]/time-off`, `DELETE /api/doctors/[id]/time-off/[timeOffId]`

**FE**: Doctors don't have a dedicated page in the current UI — add a "Doctors" tab under Settings, or a new `/doctors` route? **Decision**: add `/doctors` route to match the existing nav model (Patients, Appointments, etc.). Update [components/layout/NewSidebar.tsx](../../../components/layout/NewSidebar.tsx) with the new nav item.

**Tests**: Vitest for the unique `(clinicId, name)` doctor constraint; Vitest for the schedule overlap rule (one doctor cannot have two schedules covering the same minute on the same day).

### Phase 4 — Appointments CRUD + slot availability

**Schema**: none (Appointment model already exists with `@@unique([doctorId, scheduledAt])`).

**Routes**:

- `GET/POST /api/appointments`, `GET/PATCH/DELETE /api/appointments/[id]`
- `GET /api/availability?doctorId=…&from=…&to=…` — returns bookable slots derived from `DoctorSchedule` minus `DoctorTimeOff` minus existing `Appointment` rows.

**Error mapping**: `P2002` on `(doctorId, scheduledAt)` → `409 SLOT_TAKEN`.

**FE**: replace `mockAppointments` in [components/pages/ImprovedAppointmentsPage.tsx](../../../components/pages/ImprovedAppointmentsPage.tsx) and [components/pages/NewDashboardPage.tsx](../../../components/pages/NewDashboardPage.tsx). `NewAppointmentModal` calls `/api/availability` to populate slot picker; submit catches `409` and re-fetches availability.

**Tests**: Vitest for the availability query (an `Appointment` blocks its slot; `DoctorTimeOff` removes the day; soft-deleted doctor returns no slots). Playwright happy path: book appointment → see it on calendar; double-book → see 409 toast.

### Phase 5 — AI Settings wiring

**Schema**: none.

**Routes**:

- `GET  /api/ai-settings` — returns the calling clinic's row (1:1 with clinic via `clinicId` unique).
- `PATCH /api/ai-settings` — partial update.

**Validation**: `lib/validations/ai-settings.ts`.

**FE**: [components/pages/NewSettingsPage.tsx](../../../components/pages/NewSettingsPage.tsx#L225) AI tab — convert hard-coded `defaultValue` inputs into a react-hook-form section reading from server-fetched settings. Save calls `apiPatch('/api/ai-settings', …)` → toast.

**Tests**: Vitest — update is scoped (clinic A cannot update clinic B's settings); zod rejects empty `agentName`.

### Checkpoint with user after Phase 5

Refresh `PROGRESS.md`, summarize to user, get green light for Phases 6–10.

### Phase 6 — Team management

**Schema**: `StaffInvitation` already exists. **Add**: `Clinic.timezone` is already there; no change.

**Server actions**:

- `inviteStaff(formData)` — generates token, inserts `StaffInvitation`, sends email (stub for now — log to console + return token; real provider in Phase 8 follow-up).
- `acceptInvite(token, formData)` — at `/auth/invite/[token]`: validates token, creates Supabase auth user, creates `ClinicStaff` row linked to the invitation's `clinicId`, marks invite `acceptedAt`.
- `revokeInvite(invitationId)`.
- `deactivateStaff(staffId)`, `reactivateStaff(staffId)` (Admin only via `requireRole(['Admin'])`).

**FE**: new Settings → Team tab listing current staff + pending invitations, with "Invite" button.

**Tests**: Vitest — only Admin can deactivate; expired/accepted invites cannot be re-used; invitation email is `@@unique([clinicId, email])` so re-inviting the same person updates the existing pending row.

### Phase 7 — Storage helper

**New**: [lib/storage/recordings.ts](../../../lib/storage/recordings.ts).

- `getRecordingUploadUrl(staff, callLogId): Promise<{ uploadUrl, path }>` — signed URL for the voice provider to PUT to.
- `getRecordingDownloadUrl(staff, callLogId): Promise<string>` — signed URL the staff client uses to play back.
- Bucket: `clinic-recordings`, private, server-side only access.

**Setup doc**: short README in `lib/storage/` listing the bucket policy SQL/UI steps so the operator can apply it in Supabase.

**Tests**: Vitest — staff from clinic A cannot mint a signed URL for clinic B's recording (the helper looks up `CallLog` via `clinicWhere(staff)` first).

### Phase 8 — Voice webhooks + tenant resolution

**Schema** (`add_voice_phone_and_webhook_events` migration):

- `Clinic.voicePhone String? @unique` — the inbound number that maps to this clinic.
- `WebhookEvent` table: `id`, `providerEventId @unique`, `provider`, `payload Json`, `receivedAt`, `processedAt?`, `error?`. Idempotency: providers retry; we look up by `providerEventId` and short-circuit if `processedAt` is set.

**Routes** (under `app/api/voice/`, behind `requireWebhookSecret` middleware that checks `X-Voice-Webhook-Secret` header against an env var):

- `POST /api/voice/incoming-call` — call started; create `CallLog` row.
- `POST /api/voice/transcript-chunk` — append to `CallLog.transcript` (Json array of turns).
- `POST /api/voice/call-ended` — set `endedAt`, `outcome`, `durationSec`, optionally create `Appointment`.

**Helper**: `resolveClinicFromInbound(toNumber): Clinic | null` — looks up `Clinic.voicePhone`.

**Tests**: Vitest — replay same `providerEventId` twice; second call must not double-insert. Unknown number → 404. Bad secret → 401.

### Phase 9 — Realtime channel

**No schema change.**

**FE**: in [components/pages/NewAIReceptionistPage.tsx](../../../components/pages/NewAIReceptionistPage.tsx), replace `mockCalls` with:

- Server-side initial fetch via `lib/calls/queries.ts`.
- Client-side `useEffect` subscribes to Supabase Realtime channel `clinic:<clinicId>:call_log` for `INSERT` / `UPDATE`.
- The clinic-scoping is enforced server-side (the channel name embeds `clinicId`, and the bucket's RLS policy restricts subscriptions).

**Backend setup**: enable Realtime on the `CallLog` table in Supabase (`alter publication supabase_realtime add table call_log`). RLS policy: `clinicId = (select clinicId from clinic_staff where authUserId = auth.uid())`. **This is the first time we use Supabase RLS** — until now we relied on app-layer scoping. Document this clearly in `docs/realtime-rls.md`.

**Tests**: Playwright — open two browsers with different clinics; insert a `CallLog` for clinic A and assert clinic B's UI does not update.

### Phase 10 — Tests + CI

**Installs**: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@playwright/test`.

**Config**:

- `vitest.config.ts` — node env, separate `unit` and `integration` projects (integration hits a test Postgres).
- `playwright.config.ts` — starts `npm run dev` against a test DB, uses `globalSetup` to seed a test clinic + staff via the existing `register` Server Action.

**Test inventory by phase** is built up phase-by-phase (each implementing agent adds its tests inline); Phase 10 is "fill the gaps and turn on CI."

**CI** (`.github/workflows/ci.yml`):

- Job 1: `npm run lint`
- Job 2: `npx prisma validate && npm run build`
- Job 3: `npm run test:unit` (Vitest)
- Job 4: `npm run test:e2e` (Playwright, against ephemeral Supabase project — or local supabase + pgbouncer if cheaper)

## Acceptance criteria (whole spec)

- Every dashboard route renders live data; `data/mockData.ts` may remain for type re-use but no `New*` page imports it for rendering.
- Every domain has zod validation, tenant-scoped query helpers, route handlers using the shared response shape, and at least one Vitest test asserting tenant isolation.
- `app/api/voice/*` exists with shared-secret auth, idempotency, and writes into `CallLog`.
- Voice provider integration is **wireable**: the AI module can be added later by configuring a provider to call `POST /api/voice/*` with the secret, and the front-end will update in real time.
- `PROGRESS.md` shows ✅ for every line in §5 (Backend per domain) and §7 (AI-module readiness) except the explicitly-deferred items (job runner, audit log, Prisma extension, AI vendor).
- CI runs on every PR. Tests pass on `main`.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Tenant scoping forgotten in a new route handler | Vitest pattern: every new domain ships with a "clinic A cannot see clinic B" test. PR review checklist will reference this. |
| Mock-data → live-data shape mismatch breaks UI | FE engineer maps Prisma types to existing component prop types in a per-domain `lib/<domain>/serializers.ts` rather than changing component contracts. |
| Supabase Realtime RLS misconfigured → cross-clinic leak | Phase 9 ships with the Playwright dual-clinic test. RLS policy is in a tracked SQL file under `prisma/realtime-policies.sql`. |
| Webhook secret leaks in logs | Logger redacts `X-Voice-Webhook-Secret`. Use `crypto.timingSafeEqual` to compare. |
| Test DB pollution between Playwright runs | `globalSetup` truncates `clinic`, `clinic_staff`, `patient`, `appointment`, `call_log` tables before run; uses a dedicated test database (`DATABASE_URL_TEST`). |
| Big diff from Phase 1 commit makes review impossible | Phase 1 is split into two narrowly-scoped commits and committed before any new code lands. |

## Open questions deferred to implementation

- Whether to mark patients soft-deleted (`deletedAt`) or hard-delete — defaulting to hard-delete; revisit if compliance surfaces it.
- Whether the AI tab in Settings should expose a "test the assistant" button — out of scope this round.
- Whether webhook secrets should be per-clinic or one global secret — defaulting to one global secret in env for MVP; per-clinic when multi-tenant voice numbers become a thing.
