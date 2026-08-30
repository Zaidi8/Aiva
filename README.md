# Aiva

AI-powered healthcare appointment management system. Aiva pairs a full-featured
clinic management **dashboard** (Next.js) with an **AI voice receptionist**
(LiveKit) that answers patient calls, checks availability, and books,
reschedules, and cancels appointments — all persisted to a shared Postgres
database.

## Architecture Overview

The repository has two cooperating halves:

| Half                | Path                    | Stack                                      |
| ------------------- | ----------------------- | ------------------------------------------ |
| **Web app**         | `.` (repo root)         | Next.js 16, React 19, TypeScript, Tailwind v4 |
| **Voice agent**     | [`aiva-voice-agent/`](aiva-voice-agent) | Python, `livekit-agents`, LiveKit Cloud |

The web app exposes a set of **voice webhooks** (`/api/voice/*`) that the Python
agent calls to fetch the clinic context and to read/write scheduling data. Both
halves talk to the same Supabase Postgres database via Prisma.

```
             live phone call
                   │
                   ▼
   ┌─────────────────────────────────┐      HTTP /api/voice/*       ┌────────────────────────────┐
   │  aiva-voice-agent (Python)      │ ────────────────────────────► │  Next.js web app           │
   │  LiveKit SIP / LiveKit Cloud    │   x-webhook-secret auth       │  (Vercel)                 │
   │  STT · LLM · TTS · tools        │                               │   ├─ dashboard (dashboard) │
   └─────────────────────────────────┘                               │   └─ voice webhooks ──────►│
                                                                     └────────────┬───────────────┘
                                                                                  ▼
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

### Database (Prisma)

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). Notable models:
`Clinic`, `ClinicStaff` (linked to a Supabase `auth.users` row), `Patient`,
`Doctor`, `Appointment`, `CallLog`, `Notification`, `AiSettings`,
`DoctorSchedule`, `DoctorTimeOff`, `StaffInvitation`, and `WebhookEvent`.

Conventions worth knowing:

- `cuid()` primary keys; soft delete via `deactivatedAt`.
- **Double-booking prevention** is enforced at the DB level with a unique
  constraint on `(doctorId, scheduledAt)` — atomic and race-safe.
- The schema is multi-clinic-ready: every child model carries a `clinicId`
  tenant key.

Commands:

```bash
npm run build   # runs `prisma generate` then `next build`
npm run lint
```

### Pages / Routes

All authenticated pages live under the `(dashboard)` route group and are
server-rendered shells that hand initial data to client page components in
`components/pages/`.

| Route                | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `/auth`              | Login (Supabase). Redirects to `/set-password` on temp passwords. |
| `/set-password`      | Force new password for provisioned team members.                 |
| `/onboarding`        | Guided first-run setup: clinic details, first doctor, invite team. |
| `/dashboard`         | Overview summary + today's appointments.                          |
| `/appointments`      | Appointment CRUD, search/filter, calendar, New Appointment modal.  |
| `/patients`          | Patient records with search.                                      |
| `/doctors`           | Doctor roster; schedule + time-off management per doctor.          |
| `/team`              | Staff roster & invitations (admin-only management).               |
| `/ai-receptionist`   | Voice call log + today's AI call summary.                          |
| `/analytics`         | Charts & reporting (range-selectable).                             |
| `/settings`          | Tabs: Profile, AI, Notifications, Security, Appearance.            |
| `/ui-kit`            | Component library showcase.                                        |

Server-rendered pages use `requireStaff()` for auth + tenant scoping; an Edge
proxy (`proxy.ts` → `lib/supabase/proxy.ts`) gates session access before routes
execute.

### API Routes

- Standard CRUD: `/api/calls`, `/api/patients`, `/api/doctors`,
  `/api/appointments` (incl. `[id]/reschedule`), `/api/staff`, `/api/clinic`,
  `/api/ai-settings`, `/api/availability`, `/api/notifications`,
  `/api/analytics`, `/api/dashboard-summary`, `/api/me`.
- **Voice webhooks** (`/api/voice/*`), guarded by `x-webhook-secret`:
  - `clinic-context` — per-call clinic + doctor + AI settings DTO.
  - `doctors`, `availability`, `appointments` — read-only lookups.
  - `book`, `cancel`, `reschedule` — write operations.
  - `incoming-call`, `transcript-chunk`, `call-ended` — call-log lifecycle.
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
| Orchestration    | `livekit-agents` (Python)                                        |
| VAD              | Silero (`livekit-plugins-silero`)                                |
| Turn detection   | LiveKit `turn-detector` (English model)                          |
| STT              | Groq Whisper Large v3 Turbo (`livekit-plugins-groq`)            |
| LLM              | Groq `openai/gpt-oss-120b` → `openai/gpt-oss-20b` fallback       |
| TTS              | ElevenLabs voice "Sarah" (`livekit-plugins-elevenlabs`)         |

### What the agent can do

Using read-only + write **LLM tools** ([`tools.py`](aiva-voice-agent/tools.py)):

- `list_doctors` — list clinic doctors by name/specialty.
- `check_availability` — check open slots for a doctor on a date (optionally a
  specific time, with nearest-alternatives).
- `lookup_appointments` — find a caller's upcoming appointments by phone.
- `book_appointment` — book a slot (creates the patient on a new phone number).
- `cancel_appointment` — cancel an appointment.
- `reschedule_appointment` — move an appointment to a verified-open time.

Each call also:

- **Fetches clinic context** (`clinic_context.py`) into the system prompt +
  greeting, with an in-process cache (`CONTEXT_CACHE_TTL_S`) and a fail-safe
  fallback prompt if the backend is unreachable.
- **Persists the call** (`call_logs.py`) to the `CallLog` table via
  `incoming-call` / `transcript-chunk` / `call-ended` webhooks — transcripts,
  duration, detected intent, and any resulting appointment/patient are linked.
- **Sanitizes speech** (`speech_filter.py`) so tool-call syntax the LLM might
  leak is stripped before synthesis.
- **Stays resilient**: per-model rate-limit fallback via `FallbackAdapter`, a
  spoken apology if the LLM fails, and fail-soft tool/webhook errors so a bad
  lookup never drops a live call.

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

### Run

```bash
python agent.py dev          # local dev worker
python agent.py start        # production worker mode (used in the container)
```

To make a test call, connect via LiveKit's Agents Playground
(<https://agents-playground.livekit.io>) using your LiveKit Cloud project.

### Production Deployment

- **Container**: [`Dockerfile`](aiva-voice-agent/Dockerfile) builds a
  non-root image that pre-downloads VAD + turn-detector models, and runs
  `python agent.py start`.
- **CI/CD**: [`.github/workflows/deploy-agent.yml`](.github/workflows/deploy-agent.yml)
  auto-deploys the agent to LiveKit Cloud whenever `aiva-voice-agent/**`
  changes on `main` (uses `livekit/deploy-action`). Also supports manual
  deploys from the Actions tab.

---

## Development Commands

```bash
npm run dev        # start the web app (localhost:3000)
npm run build      # prisma generate + production build
npm run start      # run the production server
npm run lint       # lint the web app
```

---

## Deployment Notes

- The Next.js web app is deployed to **Vercel** (`vercel.json` pins region
  `bom1` = Mumbai, near the Supabase DB). Push to `main` auto-deploys.
- The voice agent is deployed separately to **LiveKit Cloud** via the GitHub
  Action above.
- Dashboard and `/api/*` routes are gated by Supabase Auth; `/api/voice/*`
  webhooks are gated by the shared `VOICE_WEBHOOK_SECRET`.
