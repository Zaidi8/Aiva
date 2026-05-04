-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('Admin', 'Doctor', 'Receptionist');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('Checkup', 'Consultation', 'FollowUp', 'Emergency');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Pending', 'Confirmed', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('Booking', 'Reschedule', 'Cancellation', 'Inquiry');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('Completed', 'Assisted', 'Transferred', 'Failed');

-- CreateEnum
CREATE TYPE "CallSentiment" AS ENUM ('Positive', 'Neutral', 'Negative');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('Confirmation', 'Reminder', 'Cancellation', 'Reschedule', 'System');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sent', 'Failed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'Push', 'Email');

-- CreateTable
CREATE TABLE "clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_staff" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'Receptionist',
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "clinic_id" TEXT NOT NULL,

    CONSTRAINT "clinic_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "medical_history" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "clinic_id" TEXT NOT NULL,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "available_slots" JSONB,
    "working_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "clinic_id" TEXT NOT NULL,

    CONSTRAINT "doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_log" (
    "id" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "detected_intent" "CallType",
    "outcome" "CallOutcome" NOT NULL,
    "transcript" JSONB,
    "sentiment" "CallSentiment",
    "quality_rating" INTEGER,
    "recording_url" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patient_id" TEXT,
    "appointment_id" TEXT,

    CONSTRAINT "call_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL DEFAULT 'Aiva',
    "greeting_message" TEXT NOT NULL DEFAULT 'Hello! Thank you for calling. How may I help you today?',
    "auto_book" BOOLEAN NOT NULL DEFAULT true,
    "send_confirmations" BOOLEAN NOT NULL DEFAULT true,
    "handle_rescheduling" BOOLEAN NOT NULL DEFAULT true,
    "emergency_transfer" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "clinic_id" TEXT NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_staff_auth_user_id_key" ON "clinic_staff"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_staff_email_key" ON "clinic_staff"("email");

-- CreateIndex
CREATE INDEX "clinic_staff_clinic_id_idx" ON "clinic_staff"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_clinic_id_idx" ON "patient"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_phone_number_idx" ON "patient"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_email_key" ON "doctor"("email");

-- CreateIndex
CREATE INDEX "doctor_clinic_id_idx" ON "doctor"("clinic_id");

-- CreateIndex
CREATE INDEX "appointment_clinic_id_idx" ON "appointment"("clinic_id");

-- CreateIndex
CREATE INDEX "appointment_patient_id_idx" ON "appointment"("patient_id");

-- CreateIndex
CREATE INDEX "appointment_doctor_id_scheduled_at_idx" ON "appointment"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointment_scheduled_at_idx" ON "appointment"("scheduled_at");

-- CreateIndex
CREATE INDEX "appointment_status_idx" ON "appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_doctor_id_scheduled_at_key" ON "appointment"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "call_log_patient_id_idx" ON "call_log"("patient_id");

-- CreateIndex
CREATE INDEX "call_log_appointment_id_idx" ON "call_log"("appointment_id");

-- CreateIndex
CREATE INDEX "call_log_patient_phone_idx" ON "call_log"("patient_phone");

-- CreateIndex
CREATE INDEX "call_log_started_at_idx" ON "call_log"("started_at");

-- CreateIndex
CREATE INDEX "call_log_outcome_idx" ON "call_log"("outcome");

-- CreateIndex
CREATE INDEX "notification_patient_id_idx" ON "notification"("patient_id");

-- CreateIndex
CREATE INDEX "notification_appointment_id_idx" ON "notification"("appointment_id");

-- CreateIndex
CREATE INDEX "notification_status_idx" ON "notification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_clinic_id_key" ON "ai_settings"("clinic_id");

-- AddForeignKey
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor" ADD CONSTRAINT "doctor_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_log" ADD CONSTRAINT "call_log_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_log" ADD CONSTRAINT "call_log_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
