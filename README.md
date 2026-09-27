# Aiva

AI-powered healthcare appointment management system. Aiva pairs a full-featured
clinic management **dashboard** (Next.js) with an **AI voice receptionist**
(LiveKit) that answers patient calls, checks availability, and books,
reschedules, and cancels appointments — all persisted to a shared Postgres
database, with SMS confirmations sent to patients on every change.

## Architecture Overview

The repository has two cooperating halves:

| Half                | Path                    | Stack                                      |
| ------------------- | ----------------------- | ------------------------------------------ |
| **Web app**         | `.` (repo root)         | Next.js 16, React 19, TypeScript, Tailwind v4 |
| **Voice agent**     | [`aiva-voice-agent/`](aiva-voice-agent) | Python, `livekit-agents`, LiveKit Cloud |

The web app exposes a set of **voice webhooks** (`/api/voice/*`) that the Python
agent calls to fetch the clinic context and to read/write scheduling data. Both
halves talk to the same Supabase Postgres database via Prisma. Appointment
changes made through *either* half funnel through the same server-side SMS
dispatch, so patients get the same confirmation text regardless of who booked.

```
              live phone call
                    │
                    ▼
    ┌─────────────────────────────────┐      HTTP /api/voice/*       ┌────────────────────────────┐
    │  aiva-voice-agent (Python)      │ ────────────────────────────► │  Next.js web app           │
    │  LiveKit SIP / LiveKit Cloud    │   x-webhook-secret auth       │  (Vercel)                 │
    │  STT · LLM · TTS · tools        │                               │   ├─ dashboard (dashboard) │
    └─────────────────────────────────┘                               │   └─ voice webhooks ──────►│
                                                                      └──────┬──────────┬──────┘
                                                     SMS dispatch ◄──────────┘          │
                                            (TextBee)                                 ▼
                                                                    ┌────────────────────────────┐
                                                                    │  Supabase Postgres (Prisma) │
                                                                    └────────────────────────────┘
```

---

## Web App (Next.js)

### Tech Stack

- **Framework**: Next.js 16 (App Router, server components), React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4, shadcn/ui components (Radix primitives)
- **Data**: Prisma ORM over a Supabase Postgres database
- **Auth**: Supabase Auth (server-side JWT, Edge proxy session middleware)
- **Validation**: Zod schemas in `lib/validations/`, shared by route handlers
  and voice webhooks
- **SMS**: TextBee gateway via a provider interface (`lib/sms/`)
- **Notifications**: `sonner` toasts
- **Deployment**: Vercel (region `bom1`)

### Getting Started

```bash
npm install
npm run dev
```

The app runs on <http://localhost:3000>.

### Environment Setup

Copy `.env.example` to `.env` and fill in the values:

| Variable                          | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (dashboard ↔ server client)           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — browser-safe          |
| `SUPABASE_SECRET_KEY`             | Supabase service-role key — **server only**, bypasses RLS  |
| `DATABASE_URL`                    | Prisma pooled connection (`?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL`                      | Prisma direct connection (for migrations only)             |
| `VOICE_WEBHOOK_SECRET`            | Shared secret guarding `/api/voice/*` webhooks (fail-closed) |
| `TEXTBEE_API_KEY`                 | TextBee SMS gateway key — **server only**                  |
| `TEXTBEE_DEVICE_ID`               | Optional: pin a specific Android gateway device            |
| `TEXTBEE_SIM_SUBSCRIPTION_ID`     | Optional: force a SIM slot on multi-SIM devices (1-based)  |
| `SMS_DEFAULT_COUNTRY_CODE`        | Optional: home region for E.164 conversion (default `92`)  |

### Database (Prisma)

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). Models:
`Clinic`, `ClinicStaff` (linked to a Supabase `auth.users` row), `Patient`,
`Doctor`, `Appointment`, `CallLog`, `Notification`, `AiSettings`,
`DoctorSchedule`, `DoctorTimeOff`, `StaffInvitation`, `FailedBooking`, and
`WebhookEvent`.

Conventions worth knowing:

- `cuid()` primary keys; soft delete via `deactivatedAt`.
- **Double-booking prevention** is enforced at the DB level with a unique
  constraint on `(doctorId, scheduledAt)` — atomic and race-safe.
- `FailedBooking` parks voice writes that exhausted the agent's own retries, so
  a booking never vanishes silently once the caller has hung up.
- `WebhookEvent` is the idempotency log for inbound webhooks — providers retry
  on flaky responses, so handlers short-circuit when `processedAt` is already set.
- The schema is multi-clinic-ready: every child model carries a `clinicId`
  tenant key.

Commands:

```bash
npm run build   # runs `prisma generate` then `next build`
npm run lint
```

### Pages / Routes

All authenticated pages live under the `(dashboard)` route group. Each route is
a thin **server component** that enforces auth/tenant scope, then hands initial
data to the matching client component in `components/pages/`.

| Route                | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `/auth`              | Login (Supabase). Redirects to `/set-password` on temp passwords. |
| `/set-password`      | Force new password for provisioned team members.                 |
| `/onboarding`        | Guided first-run setup: clinic details, first doctor, invite team. |
| `/dashboard`         | Overview summary + today's appointments.                          |
| `/appointments`      | Appointment CRUD, search/filter, calendar, New Appointment modal.  |
| `/patients`          | Patient records with search.                                      |
| `/doctors`           | Doctor roster; schedule + time-off management per doctor.          |
| `/team`              | Staff roster & invitations (**Admin only**).                       |
| `/ai-receptionist`   | Voice call log + today's AI call summary.                          |
| `/analytics`         | Charts & reporting, range-selectable (**Admin only**).             |
| `/settings`          | Tabs: Profile, Security, AI Settings.                             |
| `/ui-kit`            | Component library showcase (hidden in production).                |

Server-rendered pages use `requireStaff()` for auth + tenant scoping; an Edge
proxy (`proxy.ts` → `lib/supabase/proxy.ts`) gates session access before routes
execute. The proxy matcher deliberately **excludes** `/api/*` — every route
handler gates itself instead.

### Roles & Permissions (RBAC)

[`lib/rbac.ts`](lib/rbac.ts) is the single source of truth and is client-safe,
so server code and the sidebar nav share one matrix. Three roles map to the
Prisma `StaffRole` enum:

| Role          | Capabilities                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| **Admin**     | Everything (all 12 permissions): team, clinic, AI settings, all data.        |
| **Receptionist** | Scheduling, patients, doctor read, call log read (7 permissions).          |
| **Doctor**    | **Read-only**, and scoped to their own records (4 permissions).               |

`can(role, permission)` checks a role; `withApiCan([...])` /
`withApiRole(['Admin'])` / `withApiStaff()` wrap route handlers; page shells call
`can()` directly. Data scoping lives in [`lib/role-scope.ts`](lib/role-scope.ts):
`doctorScope(staff)` returns a clinic-wide scope for Admin/Receptionist and
limits a `Doctor` login to the `Doctor` row linked via `Doctor.clinicStaffId`.
`getCurrentStaff()` in `lib/auth.ts` auto-links an unlinked Doctor login to a
same-clinic `Doctor` row with a matching email on first fetch.

### SMS Confirmations

Outbound texts are dispatched from `lib/notifications/mutations.ts` through the
provider-agnostic `SmsProvider` interface
([`lib/sms/provider.ts`](lib/sms/provider.ts)) to
[`lib/sms/textbee.ts`](lib/sms/textbee.ts) (TextBee, an Android SMS gateway).
Provider contract: **always resolves, never throws** — a failed text must never
block the appointment write.

- Fires on **confirmation**, **reschedule**, and **cancellation**, from both the
  dashboard and the voice agent (voice writes call the same dispatch helpers).
- Gated on `AiSettings.sendConfirmations`; numbers normalised to E.164 via
  `lib/voice/phone.ts`; message times rendered in clinic-local time.
- Duplicate-suppressed per event (e.g. one confirmation SMS ever per
  appointment; a cancellation only texts if a confirmation actually went out).
- Every attempt is recorded as a `Notification` row — `Pending` → `Sent` /
  `Failed`, keeping the TextBee `smsBatchId` as `providerRef`.

### API Routes

- Standard CRUD: `/api/appointments` (+ `[id]`, `[id]/reschedule`),
  `/api/patients` (+ `[id]`), `/api/doctors` (+ `[id]`, `[id]/schedule`,
  `[id]/time-off`, `[id]/time-off/[timeOffId]`), `/api/staff` (+ `[id]`, Admin
  only), `/api/calls` (+ `[id]`), `/api/clinic`, `/api/ai-settings`,
  `/api/availability`, `/api/notifications`, `/api/analytics`,
  `/api/dashboard-summary`, `/api/me`, `/api/auth/password`.
- **Voice webhooks** (`/api/voice/*`), guarded by `x-webhook-secret`:
  - `clinic-context` — per-call clinic + doctor + AI settings DTO.
  - `doctors`, `availability`, `appointments` — read-only lookups.
  - `book`, `cancel`, `reschedule` — write operations.
  - `incoming-call`, `transcript-chunk`, `call-ended` — call-log lifecycle.
  - `failed-booking` — parks a write that exhausted the agent's retries.
  - Inbound webhooks are **idempotent** via `WebhookEvent` dedup.

---

## AI Voice Agent (`aiva-voice-agent/`)

A LiveKit Agents worker (Python) that runs Aiva's real-time voice conversation.
It connects to a LiveKit room over **SIP** (phone), streams speech
transcription + synthesis, and uses LLM tools to read/write the shared database
through the web app's `/api/voice/*` webhooks.

> Note: the agent is deployed as a worker to **LiveKit Cloud** (see
> `livekit.toml`), which exposes its own **LiveKit-hosted SFTP/SIP trunk** and
> auto-deploys from CI. It is not a standalone user-facing server.

### Stack

| Layer            | Provider                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Orchestration    | `livekit-agents` 1.5.12 (Python)                                 |
| VAD              | Silero (`livekit-plugins-silero`)                                |
| Turn detection   | LiveKit `turn-detector` (English model)                          |
| STT              | Groq Whisper Large v3 Turbo (`livekit-plugins-groq`)            |
| LLM              | Groq `qwen/qwen3.8-27b` → `openai/gpt-oss-120b` fallback         |
| TTS              | ElevenLabs voice "Sarah" (`livekit-plugins-elevenlabs`)         |

The primary and fallback model ids are overridable via `AIVA_PRIMARY_MODEL` /
`AIVA_FALLBACK_MODEL`. Keep `max_completion_tokens` at **512** — Groq's
free-tier limit for `qwen/qwen3.8-27b` is 1,000 output tokens/minute and a
higher cap makes the API reject the whole request. The fallback must stay
tool-capable and high-capability: a weak fallback hallucinates mid-conversation.

### What the agent can do

Using read-only + write **LLM tools** ([`tools.py`](aiva-voice-agent/tools.py)):

- `list_doctors` — list clinic doctors by name/specialty.
- `check_availability` — check open slots for a doctor on a date, either at one
  named time or across a window (with nearest-alternatives).
- `lookup_appointments` — find a caller's upcoming appointments by phone.
- `book_appointment` — book a slot (creates the patient on a new phone number).
- `cancel_appointment` — cancel an appointment.
- `reschedule_appointment` — move an appointment to a verified-open time.

Write tools are gated on `AiSettings`: `book_appointment` on `autoBook`,
`cancel_appointment` / `reschedule_appointment` on `handleRescheduling`.

Each call also:

- **Fetches clinic context** (`clinic_context.py`) into the system prompt +
  greeting, with an in-process cache (`CONTEXT_CACHE_TTL_S`, 60s) and a
  fail-closed fallback prompt if the backend is unreachable — the agent
  apologises rather than inventing clinic details.
- **Persists the call** (`call_logs.py`) to the `CallLog` table via
  `incoming-call` / `transcript-chunk` / `call-ended` webhooks — transcripts,
  duration, detected intent, and any resulting appointment/patient are linked.
- **Sanitizes speech** (`speech_filter.py`) so tool-call syntax the LLM might
  leak is stripped before synthesis.
- **Refuses double bookings**: when the backend reports a conflict, the tool
  speaks the clash, records a per-call fingerprint in `ToolConfig.conflict_refused`,
  and raises `StopResponse` — a later `confirm=True` on that same slot is
  short-circuited without another write, so a confabulated confirmation can't
  force a duplicate.
- **Fills dead air** with short spoken fillers while slow tools run, rather than
  leaving the caller in silence.
- **Escalates on silence** (`SilenceEscalation` in `agent.py`): after
  `AIVA_SILENCE_TIMEOUT_S` (17s) of no speech the agent prompts, escalates once
  more, then says goodbye and shuts the room down gracefully.
- **Stays resilient**: per-model rate-limit fallback via `FallbackAdapter`, a
  spoken apology if the LLM fails, fail-soft tool/webhook errors so a bad lookup
  never drops a live call, and 3-attempt exponential-backoff writes that **park**
  a persistently failing request via `/api/voice/failed-booking` for later
  reconciliation.

### Local Setup

```bash
cd aiva-voice-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env
```

Fill in `.env`:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — from
  <https://cloud.livekit.io>.
- `GROQ_API_KEY` — from <https://console.groq.com/keys>.
- `ELEVENLABS_API_KEY` — from <https://elevenlabs.io/app/settings/api-keys>.
- `AIVA_BACKEND_URL` — your deployed web-app URL (e.g.
  `<https://aiva-fyp.vercel.app>`). Must match `VOICE_WEBHOOK_SECRET` in the
  root `.env`.
- `AIVA_CLINIC_ID` — the clinic's id in the database.
- `VOICE_WEBHOOK_SECRET` — shared secret (must match the web app).

Optional tuning (all defaulted in code, see `.env.example`):
`AIVA_PRIMARY_MODEL`, `AIVA_FALLBACK_MODEL`, `AIVA_SILENCE_TIMEOUT_S`,
`AIVA_SILENCE_MAX_PROMPTS`.

### Run

```bash
python agent.py dev            # local dev worker
python agent.py console        # local text/audio console
python agent.py start          # production worker mode (used in the container)
```

To make a test call, connect via LiveKit's Agents Playground
(<https://agents-playground.livekit.io>) using your LiveKit Cloud project.

### Production Deployment

- **Container**: [`Dockerfile`](aiva-voice-agent/Dockerfile) builds a
  non-root image that pre-downloads VAD + turn-detector models, and runs
  `python agent.py start`. One process is kept warm so a call never pays
  spawn + prewarm latency.
- **CI/CD**: [`.github/workflows/deploy-agent.yml`](.github/workflows/deploy-agent.yml)
  auto-deploys the agent to LiveKit Cloud whenever `aiva-voice-agent/**`
  changes on `main` (uses `livekit/deploy-action` + a status-retry health
  check). Also supports manual deploys from the Actions tab.

---

## Development Commands

```bash
npm run dev            # start the web app (localhost:3000)
npm run build          # prisma generate + production build
npm run start          # run the production server
npm run lint           # lint the web app
```

`npm install` runs `prisma generate` via `postinstall`.

---

## Deployment Notes

- The Next.js web app is deployed to **Vercel** (`vercel.json` pins region
  `bom1` = Mumbai, near the Supabase DB). Push to `main` auto-deploys.
- The voice agent is deployed separately to **LiveKit Cloud** via the GitHub
  Action above.
- Dashboard and `/api/*` routes are gated by Supabase Auth; `/api/voice/*`
  webhooks are gated by the shared `VOICE_WEBHOOK_SECRET`.
- Both halves read and write the same Postgres database through Prisma, so a
  change made by the receptionist in the dashboard and a change made by the
  voice agent on a phone call are indistinguishable downstream — including the
  SMS confirmation.
