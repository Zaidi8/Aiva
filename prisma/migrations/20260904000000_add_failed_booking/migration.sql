-- Phase 2: DB retry/reconciliation for failed voice-appointment writes.
--
-- FailedBooking parks a voice write (book / cancel / reschedule) that the agent
-- could not persist after its own retries, so a booking is never silently lost
-- when the caller has already hung up. Clinic staff / a reconciliation job can
-- review and replay these rows later.

CREATE TABLE "failed_booking" (
  "id"          TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "payload"     JSONB NOT NULL,
  "attempts"    INTEGER NOT NULL DEFAULT 1,
  "clinic_id"   TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "error"       TEXT,
  CONSTRAINT "failed_booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failed_booking_clinic_id_idx" ON "failed_booking"("clinic_id");
CREATE INDEX "failed_booking_resolved_at_idx" ON "failed_booking"("resolved_at");
