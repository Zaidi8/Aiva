-- Phase 8: AI module seams
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Clinic.voicePhone (unique) — inbound number → clinic resolution.
-- 2) CallLog.clinicId (NOT NULL FK), CallLog.providerCallId (unique),
--    CallLog.updatedAt, default-able outcome + durationSec for partial writes.
-- 3) WebhookEvent — idempotency log for inbound webhooks.

-- 1. Clinic.voicePhone
ALTER TABLE "clinic" ADD COLUMN "voice_phone" TEXT;
CREATE UNIQUE INDEX "clinic_voice_phone_key" ON "clinic"("voice_phone");

-- 2. CallLog additions
-- Existing rows: 0 (verified at migration time). Safe to add NOT NULL clinic_id.
ALTER TABLE "call_log"
  ADD COLUMN "clinic_id"        TEXT NOT NULL,
  ADD COLUMN "provider_call_id" TEXT,
  ADD COLUMN "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "call_log"
  ALTER COLUMN "duration_sec" SET DEFAULT 0,
  ALTER COLUMN "outcome"      SET DEFAULT 'Failed';

CREATE UNIQUE INDEX "call_log_provider_call_id_key" ON "call_log"("provider_call_id");
CREATE INDEX "call_log_clinic_id_idx" ON "call_log"("clinic_id");

ALTER TABLE "call_log"
  ADD CONSTRAINT "call_log_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. WebhookEvent
CREATE TABLE "webhook_event" (
  "id"                 TEXT NOT NULL,
  "provider"           TEXT NOT NULL,
  "provider_event_id"  TEXT NOT NULL,
  "event_type"         TEXT NOT NULL,
  "payload"            JSONB NOT NULL,
  "received_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at"       TIMESTAMP(3),
  "error"              TEXT,
  CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_event_provider_event_id_key" ON "webhook_event"("provider_event_id");
CREATE INDEX "webhook_event_provider_event_type_idx" ON "webhook_event"("provider", "event_type");
CREATE INDEX "webhook_event_received_at_idx" ON "webhook_event"("received_at");
