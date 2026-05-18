# Finish-the-Architecture — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land foundations + agent files + Phase 1 (commit baseline) + Phase 2 (Patients CRUD pattern-setter), so subsequent phases can be planned and executed with confidence using the same conventions.

**Architecture:** Establish four layer-specialist agents (`aiva-prisma-engineer`, `aiva-api-engineer`, `aiva-fe-engineer`, `aiva-test-engineer`). Build shared API conventions (response shape, auth wrappers, error mapping, client fetcher) once. Then deliver Patients CRUD end-to-end as the reference implementation. Each later phase (3–10) gets its own dedicated plan file written just before that phase begins, so phase plans stay accurate.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6, Supabase Auth + Postgres, Tailwind v4, shadcn/ui, react-hook-form + zod, sonner. Tests via Vitest + Playwright (installed in Phase 10).

**Companion spec:** [docs/superpowers/specs/2026-05-18-finish-architecture-design.md](../specs/2026-05-18-finish-architecture-design.md)

---

## File structure for this plan

**Created in this plan:**

| File | Responsibility |
|---|---|
| `.claude/agents/aiva-prisma-engineer.md` | Layer-specialist agent: schema, migrations, query/mutation helpers |
| `.claude/agents/aiva-api-engineer.md` | Layer-specialist agent: route handlers, zod, server actions, API conventions |
| `.claude/agents/aiva-fe-engineer.md` | Layer-specialist agent: page components, forms, mock-data replacement |
| `.claude/agents/aiva-test-engineer.md` | Layer-specialist agent: Vitest + Playwright + CI |
| `lib/api/response.ts` | Shared API response helpers (`ok`, `created`, `fail*`) |
| `lib/api/with-staff.ts` | Route-handler auth wrappers (`withApiStaff`, `withApiRole`) |
| `lib/api/prisma-errors.ts` | Prisma error → HTTP response mapper |
| `lib/client/fetcher.ts` | Typed fetch wrapper used by client components |
| `lib/patients/queries.ts` | Tenant-scoped patient reads |
| `lib/patients/mutations.ts` | Tenant-scoped patient writes |
| `lib/validations/patient.ts` | zod schemas for patient input |
| `app/api/patients/route.ts` | `GET /api/patients`, `POST /api/patients` |
| `app/api/patients/[id]/route.ts` | `GET /api/patients/[id]`, `PATCH /api/patients/[id]`, `DELETE /api/patients/[id]` |

**Modified in this plan:**

| File | Why |
|---|---|
| `components/pages/NewPatientsPage.tsx` | Swap `mockPatients` for server-fetched data; wire modals to API |
| `data/mockData.ts` | Keep types, remove `mockPatients` export |
| `app/(dashboard)/patients/page.tsx` | Convert to server component to feed live data into `NewPatientsPage` |
| `PROGRESS.md` | Refresh after Phase 2 (via `audit-project` agent) |
| `.gitignore` | Add `.mcp.json` if not already ignored |

---

## Phase 1 — Commit the baseline (no agent; I do this manually)

The audit identified ~12 unstaged files that are real, working code. Land them as two narrowly-scoped commits before adding anything new, so later diffs stay reviewable.

### Task 1.1: Verify the unstaged surface

- [ ] **Step 1.1.1: Inspect status and group files**

```bash
git status --short
```

Expected output (approximately):

```
 M app/(dashboard)/layout.tsx
 M app/page.tsx
 M components/layout/NewSidebar.tsx
 M components/pages/NewLoginPage.tsx
 M prisma/schema.prisma
 D app/(auth)/login/page.tsx
?? .mcp.json
?? app/(auth)/actions.ts
?? app/(auth)/auth/
?? app/(dashboard)/_components/
?? lib/auth.ts
?? lib/clinic-scope.ts
?? lib/supabase/
?? lib/validations/
?? prisma/migrations/20260508061122_add_team_management_foundation/
?? proxy.ts
?? register-form-empty.png
?? scripts/
```

- [ ] **Step 1.1.2: Confirm `.mcp.json` should be ignored**

```bash
grep -q "^\.mcp\.json$" .gitignore && echo "already ignored" || echo "NOT IGNORED — add it"
```

If not ignored, append `.mcp.json` to `.gitignore`:

```bash
printf '\n.mcp.json\n' >> .gitignore
```

- [ ] **Step 1.1.3: Move the QA screenshot out of repo root**

```bash
mkdir -p docs/qa
git mv register-form-empty.png docs/qa/register-form-empty.png 2>/dev/null || mv register-form-empty.png docs/qa/register-form-empty.png
```

(Use `git mv` if tracked; the audit shows it as untracked, so plain `mv` is fine.)

### Task 1.2: Commit the auth + onboarding baseline

- [ ] **Step 1.2.1: Stage auth/onboarding files**

```bash
git add \
  lib/auth.ts \
  lib/clinic-scope.ts \
  lib/supabase \
  lib/validations \
  app/\(auth\)/actions.ts \
  app/\(auth\)/auth \
  app/\(auth\)/login \
  app/\(dashboard\)/layout.tsx \
  app/\(dashboard\)/_components \
  app/page.tsx \
  components/layout/NewSidebar.tsx \
  components/pages/NewLoginPage.tsx \
  prisma/schema.prisma \
  prisma/migrations/20260508061122_add_team_management_foundation \
  proxy.ts \
  .gitignore
```

- [ ] **Step 1.2.2: Verify the staged set matches expectations**

```bash
git status --short
git diff --cached --stat
```

Expected: ~15 staged files, no leftover unstaged changes for the items above. (`scripts/`, `docs/qa/register-form-empty.png` remain unstaged for the next commit.)

- [ ] **Step 1.2.3: Commit**

```bash
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(auth): supabase auth + transactional clinic onboarding

Lands the multi-tenant foundation:
- Supabase SSR client + edge proxy gating /dashboard/*
- register Server Action provisioning Clinic + Admin ClinicStaff + AiSettings
  atomically via prisma.$transaction
- getCurrentStaff/requireStaff/requireApiStaff helpers (JWT-verified)
- clinicWhere(staff) scoping helper for every Prisma read/write
- zod-validated login + register forms
- DashboardShell + NewSidebar wired to the live staff profile
- add_team_management_foundation migration (Doctor.clinicStaffId,
  DoctorSchedule, DoctorTimeOff, StaffInvitation)

This is the baseline every subsequent phase builds on.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds; `git log -1 --stat` shows ~15 files.

### Task 1.3: Commit the ops scripts + QA artifact move

- [ ] **Step 1.3.1: Stage scripts + screenshot move**

```bash
git add scripts docs/qa/register-form-empty.png
```

- [ ] **Step 1.3.2: Commit**

```bash
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
chore(scripts): supabase + prisma ops scripts

Read-only inspection and recovery scripts used while hardening the
clinic-provisioning transaction:

- db-inspect.mjs        list clinics/staff
- db-reactivate.mjs     clear deactivatedAt on a staff row by email
- repro-tx.mjs          reproduce the signup transaction in isolation
- supabase-find-user.mjs / supabase-probe.mjs / supabase-signout.mjs

These are ops escape hatches, not product features. Plus move the
register-form-empty.png QA artifact out of repo root into docs/qa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds; `git status` shows clean working tree (except `.mcp.json` if it remained untracked-and-ignored).

### Task 1.4: Sanity-check the baseline still builds

- [ ] **Step 1.4.1: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: zero TypeScript errors. Lint passes (warnings tolerated; errors are not).

- [ ] **Step 1.4.2: Build**

```bash
npm run build
```

Expected: build succeeds. If it fails on a pre-existing issue, fix it now — Phase 1 must leave `main` building.

---

## Phase 0 (interleaved) — Create the four layer-specialist agents

Done before Phase 2 begins so each agent file exists and is auto-registered for the next session.

### Task 0.1: Create `aiva-prisma-engineer`

- [ ] **Step 0.1.1: Write the agent file**

Create `/Users/bluesoft/.claude/agents/aiva-prisma-engineer.md` with the full agent definition (see "Agent file contents" section below).

- [ ] **Step 0.1.2: Verify it loads**

```bash
ls -la /Users/bluesoft/.claude/agents/aiva-prisma-engineer.md
```

Expected: file exists, ~150 lines.

### Task 0.2: Create `aiva-api-engineer`

- [ ] Write `/Users/bluesoft/.claude/agents/aiva-api-engineer.md`.

### Task 0.3: Create `aiva-fe-engineer`

- [ ] Write `/Users/bluesoft/.claude/agents/aiva-fe-engineer.md`.

### Task 0.4: Create `aiva-test-engineer`

- [ ] Write `/Users/bluesoft/.claude/agents/aiva-test-engineer.md`.

### Task 0.5: Commit the agent definitions

Agent files live in `~/.claude/agents/` (user scope, not repo scope), so they aren't committed to the Aiva repo. Nothing to commit here.

---

## Foundations (run once before Phase 2)

These files are shared by every domain. Dispatch `aiva-api-engineer` for this task — it owns `lib/api/*` and `lib/client/*`.

### Task F.1: API response helpers — `lib/api/response.ts`

- [ ] **Step F.1.1: Write the helper module**

```ts
// lib/api/response.ts
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

type FieldErrors = Record<string, string[]>;

export function ok<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(code: string, message: string, status: number, fields?: FieldErrors) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export function failValidation(error: ZodError) {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fail('VALIDATION_FAILED', 'Invalid input.', 422, fields);
}

export const failUnauthorized = () => fail('UNAUTHORIZED', 'Sign in required.', 401);
export const failForbidden    = () => fail('FORBIDDEN', 'Not allowed.', 403);
export const failNotFound     = (resource = 'Resource') => fail('NOT_FOUND', `${resource} not found.`, 404);
export const failConflict     = (message: string) => fail('CONFLICT', message, 409);
```

- [ ] **Step F.1.2: Commit**

```bash
git add lib/api/response.ts
git -c commit.gpgsign=false commit -m "feat(api): shared response helpers (ok / fail / failValidation)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task F.2: Auth wrappers — `lib/api/with-staff.ts`

- [ ] **Step F.2.1: Write the wrapper**

```ts
// lib/api/with-staff.ts
import type { NextRequest } from 'next/server';
import type { StaffRole } from '@prisma/client';
import { requireApiStaff, requireApiRole, NotAuthorizedError } from '@/lib/auth';
import { failUnauthorized, failForbidden } from './response';

type StaffArg = Awaited<ReturnType<typeof requireApiStaff>>;

type Handler<Ctx> = (req: NextRequest, ctx: Ctx, staff: StaffArg) => Promise<Response>;

export function withApiStaff<Ctx>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      const staff = await requireApiStaff();
      return await handler(req, ctx, staff);
    } catch (e) {
      if (e instanceof NotAuthorizedError) return failUnauthorized();
      throw e;
    }
  };
}

export function withApiRole<Ctx>(roles: StaffRole[]) {
  return (handler: Handler<Ctx>) => async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      const staff = await requireApiRole(roles);
      return await handler(req, ctx, staff);
    } catch (e) {
      if (e instanceof NotAuthorizedError) {
        return e.code === 'FORBIDDEN' ? failForbidden() : failUnauthorized();
      }
      throw e;
    }
  };
}
```

> NOTE for the implementing agent: confirm `requireApiStaff`/`requireApiRole` actually exist in `lib/auth.ts` with these signatures. If `NotAuthorizedError` doesn't carry a `.code` discriminator, add one (`'UNAUTHORIZED' | 'FORBIDDEN'`) in `lib/auth.ts` and re-export here.

- [ ] **Step F.2.2: Commit**

```bash
git add lib/api/with-staff.ts lib/auth.ts
git -c commit.gpgsign=false commit -m "feat(api): withApiStaff/withApiRole route-handler wrappers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task F.3: Prisma error mapper — `lib/api/prisma-errors.ts`

- [ ] **Step F.3.1: Write the mapper**

```ts
// lib/api/prisma-errors.ts
import { Prisma } from '@prisma/client';
import { fail, failConflict, failNotFound } from './response';

export function mapPrismaError(e: unknown): Response | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (e.code) {
    case 'P2002': {
      const target = Array.isArray(e.meta?.target) ? (e.meta!.target as string[]).join(',') : 'unique constraint';
      return failConflict(`Duplicate value for ${target}.`);
    }
    case 'P2003':
      return fail('FK_VIOLATION', 'Related record missing or invalid.', 422);
    case 'P2025':
      return failNotFound();
    default:
      return null;
  }
}
```

- [ ] **Step F.3.2: Commit**

```bash
git add lib/api/prisma-errors.ts
git -c commit.gpgsign=false commit -m "feat(api): map Prisma errors to API responses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task F.4: Typed client fetcher — `lib/client/fetcher.ts`

- [ ] **Step F.4.1: Write the fetcher**

```ts
// lib/client/fetcher.ts
'use client';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiBody<T> = { data: T } | { error: { code: string; message: string; fields?: Record<string, string[]> } };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as ApiBody<T>;
  if ('error' in body) {
    throw new ApiError(res.status, body.error.code, body.error.message, body.error.fields);
  }
  return body.data;
}

export const apiGet    = <T>(path: string)            => request<T>(path, { method: 'GET' });
export const apiPost   = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: JSON.stringify(body) });
export const apiPatch  = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (path: string)                => request<void>(path, { method: 'DELETE' });
```

- [ ] **Step F.4.2: Commit**

```bash
git add lib/client/fetcher.ts
git -c commit.gpgsign=false commit -m "feat(client): typed apiGet/apiPost/apiPatch/apiDelete fetcher

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Patients CRUD (pattern-setter)

Dispatched in this order: `aiva-prisma-engineer` → `aiva-api-engineer` → `aiva-fe-engineer` → `aiva-test-engineer`. After each, I review the diff before dispatching the next.

### Task 2.1 (prisma-engineer): Patient query + mutation helpers

**Files:**
- Create: `lib/patients/queries.ts`
- Create: `lib/patients/mutations.ts`

- [ ] **Step 2.1.1: Write `lib/patients/queries.ts`**

```ts
// lib/patients/queries.ts
import 'server-only';
import { prisma } from '@/lib/prisma';
import { clinicWhere, type ScopedStaff } from '@/lib/clinic-scope';
import type { Prisma } from '@prisma/client';

export type ListPatientsOpts = {
  q?: string;       // search on name or phoneNumber
  take?: number;    // default 50
  skip?: number;    // default 0
};

export async function listPatients(staff: ScopedStaff, opts: ListPatientsOpts = {}) {
  const where: Prisma.PatientWhereInput = {
    ...clinicWhere(staff),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: 'insensitive' } },
            { phoneNumber: { contains: opts.q } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    }),
    prisma.patient.count({ where }),
  ]);
  return { items, total };
}

export async function getPatient(staff: ScopedStaff, id: string) {
  return prisma.patient.findFirst({
    where: { id, ...clinicWhere(staff) },
  });
}
```

> NOTE: confirm `lib/prisma.ts` exports a `prisma` singleton; if it doesn't yet, the prisma-engineer creates it (`import { PrismaClient } from '@prisma/client'; export const prisma = globalThis.__prisma ?? new PrismaClient(); globalThis.__prisma = prisma;`).

- [ ] **Step 2.1.2: Write `lib/patients/mutations.ts`**

```ts
// lib/patients/mutations.ts
import 'server-only';
import { prisma } from '@/lib/prisma';
import { clinicWhere, type ScopedStaff } from '@/lib/clinic-scope';
import type { CreatePatientInput, UpdatePatientInput } from '@/lib/validations/patient';

export function createPatient(staff: ScopedStaff, input: CreatePatientInput) {
  return prisma.patient.create({
    data: { ...input, clinicId: staff.clinicId },
  });
}

export async function updatePatient(staff: ScopedStaff, id: string, input: UpdatePatientInput) {
  const result = await prisma.patient.updateMany({
    where: { id, ...clinicWhere(staff) },
    data: input,
  });
  if (result.count === 0) return null;
  return prisma.patient.findUniqueOrThrow({ where: { id } });
}

export async function deletePatient(staff: ScopedStaff, id: string) {
  const result = await prisma.patient.deleteMany({
    where: { id, ...clinicWhere(staff) },
  });
  return result.count > 0;
}
```

`updateMany` + `deleteMany` are the safe pattern: they will return `count: 0` for cross-tenant attempts instead of throwing on `findUnique` then leaking via update.

- [ ] **Step 2.1.3: Commit**

```bash
git add lib/patients lib/prisma.ts
git -c commit.gpgsign=false commit -m "feat(patients): tenant-scoped query/mutation helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.2 (api-engineer): Patient zod schema + route handlers

**Files:**
- Create: `lib/validations/patient.ts`
- Create: `app/api/patients/route.ts`
- Create: `app/api/patients/[id]/route.ts`

- [ ] **Step 2.2.1: Write `lib/validations/patient.ts`**

```ts
// lib/validations/patient.ts
import { z } from 'zod';
import { Gender } from '@prisma/client';

export const createPatientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  phoneNumber: z.string().trim().min(5, 'Phone number is required.').max(32),
  age: z.coerce.number().int().min(0).max(130).optional(),
  gender: z.nativeEnum(Gender).optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(500).optional(),
  medicalHistory: z.array(z.string().trim().min(1)).max(100).optional().default([]),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
```

- [ ] **Step 2.2.2: Write `app/api/patients/route.ts`**

```ts
// app/api/patients/route.ts
import type { NextRequest } from 'next/server';
import { withApiStaff } from '@/lib/api/with-staff';
import { ok, created, failValidation } from '@/lib/api/response';
import { mapPrismaError } from '@/lib/api/prisma-errors';
import { listPatients } from '@/lib/patients/queries';
import { createPatient } from '@/lib/patients/mutations';
import { createPatientSchema } from '@/lib/validations/patient';

export const runtime = 'nodejs';

export const GET = withApiStaff(async (req, _ctx, staff) => {
  const url = new URL(req.url);
  const q    = url.searchParams.get('q')    ?? undefined;
  const take = Number(url.searchParams.get('take') ?? '50');
  const skip = Number(url.searchParams.get('skip') ?? '0');
  const result = await listPatients(staff, { q, take, skip });
  return ok(result);
});

export const POST = withApiStaff(async (req, _ctx, staff) => {
  const body = await req.json().catch(() => null);
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const patient = await createPatient(staff, parsed.data);
    return created(patient);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});
```

- [ ] **Step 2.2.3: Write `app/api/patients/[id]/route.ts`**

```ts
// app/api/patients/[id]/route.ts
import type { NextRequest } from 'next/server';
import { withApiStaff } from '@/lib/api/with-staff';
import { ok, noContent, failNotFound, failValidation } from '@/lib/api/response';
import { mapPrismaError } from '@/lib/api/prisma-errors';
import { getPatient } from '@/lib/patients/queries';
import { updatePatient, deletePatient } from '@/lib/patients/mutations';
import { updatePatientSchema } from '@/lib/validations/patient';

type Ctx = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

export const GET = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const patient = await getPatient(staff, id);
  if (!patient) return failNotFound('Patient');
  return ok(patient);
});

export const PATCH = withApiStaff<Ctx>(async (req, { params }, staff) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) return failValidation(parsed.error);
  try {
    const patient = await updatePatient(staff, id, parsed.data);
    if (!patient) return failNotFound('Patient');
    return ok(patient);
  } catch (e) {
    const mapped = mapPrismaError(e);
    if (mapped) return mapped;
    throw e;
  }
});

export const DELETE = withApiStaff<Ctx>(async (_req, { params }, staff) => {
  const { id } = await params;
  const found = await deletePatient(staff, id);
  if (!found) return failNotFound('Patient');
  return noContent();
});
```

- [ ] **Step 2.2.4: Manual smoke test (browser DevTools or curl)**

Run dev server (`npm run dev`), log in as the existing test user. In another terminal, grab the Supabase cookie from the browser and:

```bash
# Unauthenticated → 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/patients
# Expected: 401

# With cookie: list (empty)
curl -s -b "sb-access-token=...; sb-refresh-token=..." \
  http://localhost:3000/api/patients | jq
# Expected: { "data": { "items": [], "total": 0 } }

# Create
curl -s -X POST -b "..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","phoneNumber":"+923001234567"}' \
  http://localhost:3000/api/patients | jq
# Expected: { "data": { "id": "...", "name": "Test Patient", ... } } and HTTP 201

# Validation failure
curl -s -X POST -b "..." \
  -H "Content-Type: application/json" \
  -d '{"name":""}' \
  http://localhost:3000/api/patients | jq
# Expected: { "error": { "code": "VALIDATION_FAILED", "fields": { "name": ["Name is required."], "phoneNumber": ["..."] } } } and HTTP 422
```

- [ ] **Step 2.2.5: Commit**

```bash
git add lib/validations/patient.ts app/api/patients
git -c commit.gpgsign=false commit -m "feat(api): patients CRUD route handlers + zod schema

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.3 (fe-engineer): Wire `NewPatientsPage` to live data

**Files:**
- Modify: `app/(dashboard)/patients/page.tsx`
- Modify: `components/pages/NewPatientsPage.tsx`
- Modify: `data/mockData.ts` (remove `mockPatients` export, keep `Patient` type)
- Modify: `components/pages/AddPatientModal.tsx` (or wherever the modal lives)
- Modify: `components/pages/PatientRecordModal.tsx`

- [ ] **Step 2.3.1: Convert `app/(dashboard)/patients/page.tsx` to a server component**

Read the existing file first. Replace with a server component that fetches via `listPatients` and passes results down:

```tsx
// app/(dashboard)/patients/page.tsx
import { requireStaff } from '@/lib/auth';
import { listPatients } from '@/lib/patients/queries';
import { NewPatientsPage } from '@/components/pages/NewPatientsPage';

export default async function PatientsRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await requireStaff();
  const { q } = await searchParams;
  const { items, total } = await listPatients(staff, { q });
  return <NewPatientsPage initialPatients={items} initialTotal={total} initialQuery={q ?? ''} />;
}
```

- [ ] **Step 2.3.2: Adapt `NewPatientsPage` to accept server-fetched data**

Read the current `components/pages/NewPatientsPage.tsx`. Remove the `import { mockPatients } from '@/data/mockData'`. Add props:

```tsx
type NewPatientsPageProps = {
  initialPatients: Patient[];
  initialTotal: number;
  initialQuery: string;
  onNavigate?: (page: string) => void;
};

export function NewPatientsPage({ initialPatients, initialTotal, initialQuery, onNavigate }: NewPatientsPageProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  // ...existing UI, but use initialPatients instead of mockPatients.
}
```

The component remains `'use client'` (it owns modal state, search input, etc.). After a successful create/update/delete from a modal, call `router.refresh()` to re-fetch the server component.

> NOTE for the fe-engineer: if the existing `Patient` type in `data/mockData.ts` differs from the Prisma `Patient`, **do not** rewrite the component's props. Instead add a `lib/patients/serializers.ts` that maps Prisma → the existing UI type. Surfacing a shape mismatch as a request to the api-engineer is fine, but don't change the API shape unilaterally.

- [ ] **Step 2.3.3: Wire `AddPatientModal` to POST**

In whichever file owns `AddPatientModal`:

```tsx
'use client';
import { apiPost, ApiError } from '@/lib/client/fetcher';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
// ...
async function onSubmit(values: NewPatientFormValues) {
  try {
    await apiPost('/api/patients', values);
    toast.success('Patient added');
    onClose();
    router.refresh();
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.fields) {
        Object.entries(e.fields).forEach(([k, errs]) =>
          form.setError(k as never, { message: errs[0] }),
        );
      } else {
        toast.error(e.message);
      }
    } else {
      toast.error('Something went wrong. Try again.');
    }
  }
}
```

- [ ] **Step 2.3.4: Wire `PatientRecordModal` edit + delete buttons to `apiPatch` / `apiDelete`**

Same pattern as 2.3.3.

- [ ] **Step 2.3.5: Remove `mockPatients` from `data/mockData.ts`**

Keep the `Patient` type export (other pages still import it). Delete the `mockPatients = [...]` array.

- [ ] **Step 2.3.6: Verify type-check + lint + browser walkthrough**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

In browser: log in → `/patients` → see empty list → "Add Patient" → fill form → save → see toast + new row → click row → edit → save → see update → delete → confirm gone. Open DevTools Network tab and verify the requests go to `/api/patients` and return the expected shapes.

- [ ] **Step 2.3.7: Commit**

```bash
git add app/\(dashboard\)/patients components/pages/NewPatientsPage.tsx \
        components/pages/AddPatientModal.tsx components/pages/PatientRecordModal.tsx \
        data/mockData.ts lib/patients/serializers.ts 2>/dev/null
git -c commit.gpgsign=false commit -m "feat(patients): wire NewPatientsPage to live data via /api/patients

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(Adjust the `git add` list to only stage files that actually changed — the agent will report which ones.)

### Task 2.4 (test-engineer): Patients critical-path tests

> Vitest is not installed yet. Two options: (a) install Vitest now and write tests; (b) defer to Phase 10. **Decision: install Vitest now**, because the tenant-isolation test is the single most valuable assertion in the whole project and is much cheaper to write next to the first domain than retrofit later. Playwright stays deferred to Phase 10.

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `__tests__/patients.test.ts`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 2.4.1: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2.4.2: Write `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.ts'],
    pool: 'forks',     // each test file gets its own process — Prisma client friendly
    testTimeout: 15_000,
  },
});
```

- [ ] **Step 2.4.3: Write `vitest.setup.ts`**

```ts
// vitest.setup.ts
import 'dotenv/config';
// Force tests to use the test DB. If DATABASE_URL_TEST is unset, fail loudly.
if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST is required for tests (separate Postgres from dev).');
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
```

- [ ] **Step 2.4.4: Add a tiny test fixture helper**

```ts
// __tests__/_helpers.ts
import { prisma } from '@/lib/prisma';
import type { ScopedStaff } from '@/lib/clinic-scope';

export async function makeClinicWithAdmin(label: string): Promise<ScopedStaff> {
  const clinic = await prisma.clinic.create({
    data: { name: `Test Clinic ${label}`, phone: `+92${Date.now()}`, address: 'x', email: `${label}@test.local` },
  });
  const staff = await prisma.clinicStaff.create({
    data: {
      authUserId: `auth_${label}_${Date.now()}`,
      fullName: `Admin ${label}`,
      email: `admin-${label}@test.local`,
      role: 'Admin',
      jobTitle: 'Practice Manager',
      clinicId: clinic.id,
    },
  });
  return { id: staff.id, clinicId: clinic.id, role: 'Admin', deactivatedAt: null } as ScopedStaff;
}

export async function resetDb() {
  // Order matters for FKs.
  await prisma.appointment.deleteMany({});
  await prisma.callLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.doctorTimeOff.deleteMany({});
  await prisma.doctorSchedule.deleteMany({});
  await prisma.doctor.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.staffInvitation.deleteMany({});
  await prisma.aiSettings.deleteMany({});
  await prisma.clinicStaff.deleteMany({});
  await prisma.clinic.deleteMany({});
}
```

- [ ] **Step 2.4.5: Write `__tests__/patients.test.ts`**

```ts
// __tests__/patients.test.ts
import { describe, beforeEach, it, expect } from 'vitest';
import { createPatient, updatePatient, deletePatient } from '@/lib/patients/mutations';
import { listPatients, getPatient } from '@/lib/patients/queries';
import { makeClinicWithAdmin, resetDb } from './_helpers';
import { prisma } from '@/lib/prisma';

describe('patients (tenant isolation)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('createPatient scopes to the calling clinic', async () => {
    const a = await makeClinicWithAdmin('A');
    const p = await createPatient(a, { name: 'Ali', phoneNumber: '+9230000001', medicalHistory: [] });
    expect(p.clinicId).toBe(a.clinicId);
  });

  it('clinic A cannot list, read, update, or delete clinic B patients', async () => {
    const a = await makeClinicWithAdmin('A');
    const b = await makeClinicWithAdmin('B');
    const pb = await createPatient(b, { name: 'B-Patient', phoneNumber: '+9230000002', medicalHistory: [] });

    const list = await listPatients(a);
    expect(list.items).toHaveLength(0);

    const fetched = await getPatient(a, pb.id);
    expect(fetched).toBeNull();

    const updated = await updatePatient(a, pb.id, { name: 'hacked' });
    expect(updated).toBeNull();
    const stillThere = await prisma.patient.findUnique({ where: { id: pb.id } });
    expect(stillThere?.name).toBe('B-Patient');

    const removed = await deletePatient(a, pb.id);
    expect(removed).toBe(false);
  });

  it('updatePatient on own patient succeeds', async () => {
    const a = await makeClinicWithAdmin('A');
    const p = await createPatient(a, { name: 'Ali', phoneNumber: '+9230000003', medicalHistory: [] });
    const updated = await updatePatient(a, p.id, { name: 'Ali Updated' });
    expect(updated?.name).toBe('Ali Updated');
  });
});
```

- [ ] **Step 2.4.6: Add scripts to `package.json`**

In `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2.4.7: Document `DATABASE_URL_TEST` in `.env.example`**

Append:

```
# Separate database for `npm test`. The test runner truncates tables between specs.
DATABASE_URL_TEST=postgresql://...
```

- [ ] **Step 2.4.8: Run the suite**

```bash
DATABASE_URL_TEST=$DATABASE_URL_TEST npx prisma migrate deploy
npm test
```

Expected: 3 tests pass.

If `DATABASE_URL_TEST` is not yet set up locally, document that requirement in the commit message and a follow-up note for the user — do not silently skip the test step.

- [ ] **Step 2.4.9: Commit**

```bash
git add vitest.config.ts vitest.setup.ts __tests__ package.json package-lock.json .env.example
git -c commit.gpgsign=false commit -m "test(patients): tenant-isolation vitest suite

Adds vitest with one process-per-file Prisma-friendly config and three
critical-path tests asserting clinic A cannot touch clinic B's patients.
Establishes the test pattern every later domain reuses.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.5: Refresh `PROGRESS.md` via `audit-project`

- [ ] Dispatch `audit-project` agent to refresh `PROGRESS.md` with Patients now ✅.

---

## Phases 3–10 — plans written just-in-time

Each phase below gets its own dedicated plan file when that phase begins. The companion spec already lists the schema/route/UI shape per phase; the plan will expand those into bite-sized tasks following the same template as Phase 2.

| Phase | Plan file (created when phase starts) |
|---|---|
| 3 — Doctors + Schedules + TimeOff | `docs/superpowers/plans/phase-3-doctors.md` |
| 4 — Appointments + availability | `docs/superpowers/plans/phase-4-appointments.md` |
| 5 — AI Settings wiring | `docs/superpowers/plans/phase-5-ai-settings.md` |
| **CHECKPOINT WITH USER** | — |
| 6 — Team management | `docs/superpowers/plans/phase-6-team.md` |
| 7 — Storage helper | `docs/superpowers/plans/phase-7-storage.md` |
| 8 — Voice webhooks | `docs/superpowers/plans/phase-8-voice-webhooks.md` |
| 9 — Realtime channel | `docs/superpowers/plans/phase-9-realtime.md` |
| 10 — Tests + CI | `docs/superpowers/plans/phase-10-tests-ci.md` |

Each phase plan ends with: (a) refresh `PROGRESS.md`, (b) report status to user.

---

## Agent file contents

The full text of each agent file is in [docs/superpowers/specs/2026-05-18-finish-architecture-design.md](../specs/2026-05-18-finish-architecture-design.md#layer-specialist-agents). When writing the files (Tasks 0.1–0.4) use the spec as the source of truth for responsibilities, owned files, and constraints. Each agent file follows the same frontmatter shape as the existing `audit-project.md`:

```yaml
---
name: aiva-<layer>-engineer
description: |
  Use this agent when … <one paragraph + 2 example blocks>
model: opus
color: <unique per agent>
---
```

Followed by a Markdown body that includes:

1. **Role** statement.
2. **Aiva conventions** the agent must obey (response shape, auth wrappers, tenant scoping, validation, error mapping, commit-message format).
3. **Owned files** (paths).
4. **Knows** (project-specific knowledge that's not derivable from the code in one read).
5. **Methodology** (ordered steps the agent follows on every task).
6. **What this agent does NOT do** (other agents' lanes).
7. **Deliverables** (what it returns to the dispatcher).

---

## Self-review (done after writing this plan)

- **Spec coverage**: every spec section maps to a task. Foundations (response, with-staff, prisma-errors, fetcher) covered in Tasks F.1–F.4. Agents in Tasks 0.1–0.4. Phase 1 in Tasks 1.1–1.4. Phase 2 in Tasks 2.1–2.5. Phases 3–10 explicitly deferred to per-phase plans (and the spec already enumerates their contents).
- **Placeholder scan**: no "TBD", no "implement later", no "similar to" — every step has the actual code or actual command. The two callouts to the implementing agent (`lib/prisma.ts` creation, `NotAuthorizedError.code` discriminator) are intentional, narrow `NOTE` blocks pointing at real existing-file checks, not deferred work.
- **Type consistency**: `ScopedStaff` is referenced in both `lib/patients/queries.ts` and `lib/patients/mutations.ts`; the plan assumes it's exported from `lib/clinic-scope.ts` (the audit confirms this file exists; if `ScopedStaff` is not the actual exported name, the prisma-engineer adjusts the import — flagged in the agent's "Knows" section). `CreatePatientInput`/`UpdatePatientInput` are defined in 2.2.1 and imported in 2.1.2 — note that Task 2.1 (prisma-engineer) runs before Task 2.2 (api-engineer) writes `lib/validations/patient.ts`. **Fix:** swap the order so the api-engineer writes the validations file first (move zod schemas to Task 2.1 or have the prisma-engineer create a thin types-only stub first).

### Order fix

Re-order Phase 2 dispatch:

1. **api-engineer** writes `lib/validations/patient.ts` (Task 2.2.1 only — just the schema and inferred types). Commits.
2. **prisma-engineer** writes `lib/patients/queries.ts` + `lib/patients/mutations.ts` importing the types from `@/lib/validations/patient`. Commits.
3. **api-engineer** returns and writes the two route handler files (2.2.2 + 2.2.3). Commits.
4. **fe-engineer** wires up the UI.
5. **test-engineer** writes the vitest suite.

This keeps each agent in its lane and respects the type dependency.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-finish-architecture-master.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks. Fits the layer-specialist agent model perfectly.
2. **Inline Execution** — I execute Phase 1 (commits) + agent file creation + Phase 2 inline, dispatching subagents only where layer specialization matters.

The user already agreed to "create appropriate agents to split the work" — that's the Subagent-Driven model. Proceeding accordingly.
