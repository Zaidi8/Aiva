-- Human escalation for the AI receptionist.
--
-- Escalation records a live voice call the agent handed to a person: why it
-- gave up, which LiveKit room the caller is sitting in, and whether staff have
-- joined yet. Same "park it so it never vanishes" intent as failed_booking, but
-- for a handoff rather than an unpersistable write.
--
-- One escalation per call (the agent latches its per-call config, so it can
-- only escalate once) — enforced here rather than in application code.

CREATE TYPE "EscalationReason" AS ENUM (
  'CallerRequested',
  'ToolFailureStreak',
  'FailedBooking',
  'Emergency'
);

CREATE TYPE "EscalationStatus" AS ENUM ('Requested', 'Claimed', 'Resolved');

CREATE TABLE "escalation" (
  "id"                  TEXT NOT NULL,
  "reason"              "EscalationReason" NOT NULL,
  "status"              "EscalationStatus" NOT NULL DEFAULT 'Requested',
  "detail"              TEXT,
  "room_name"           TEXT,
  "clinic_id"           TEXT NOT NULL,
  "claimed_by_staff_id" TEXT,
  "claimed_at"          TIMESTAMP(3),
  "resolved_at"         TIMESTAMP(3),
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  "call_log_id"         TEXT NOT NULL,
  CONSTRAINT "escalation_pkey" PRIMARY KEY ("id")
);

-- Name is Prisma's generated default for @@unique([callLogId]), which is what
-- the schema tracks. Naming it by hand here is what caused the pre-existing
-- doctor_slot_unique drift, so it is left to Prisma.
CREATE UNIQUE INDEX "escalation_call_log_id_key" ON "escalation"("call_log_id");
CREATE INDEX "escalation_clinic_id_status_idx" ON "escalation"("clinic_id", "status");
CREATE INDEX "escalation_created_at_idx" ON "escalation"("created_at");

-- An escalation is meaningless without the call it belongs to, so this is a real
-- constraint rather than a bare id: ON DELETE CASCADE means deleting a CallLog
-- (retention purge, GDPR erasure) takes its escalation with it instead of
-- leaving an orphan row that no query will ever join back to a call.
--
-- clinic_id and claimed_by_staff_id are deliberately NOT foreign keys — they are
-- plain scalars, matching FailedBooking.clinicId and the soft-delete model for
-- staff (a hard FK there would block the soft delete, or need SET NULL and lose
-- the "who took this call" audit trail).
ALTER TABLE "escalation" ADD CONSTRAINT "escalation_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Master switch for the escalate_to_human tool, mirroring how auto_book /
-- handle_rescheduling gate the write tools.
ALTER TABLE "ai_settings"
  ADD COLUMN "escalate_to_human" BOOLEAN NOT NULL DEFAULT true;
