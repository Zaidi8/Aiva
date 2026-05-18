/*
  Warnings:

  - A unique constraint covering the columns `[clinic_staff_id]` on the table `doctor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clinic" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi';

-- AlterTable
ALTER TABLE "clinic_staff" ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "job_title" TEXT;

-- AlterTable
ALTER TABLE "doctor" ADD COLUMN     "clinic_staff_id" TEXT,
ADD COLUMN     "deactivated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "doctor_schedule" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "doctor_id" TEXT NOT NULL,

    CONSTRAINT "doctor_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_time_off" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "doctor_id" TEXT NOT NULL,

    CONSTRAINT "doctor_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinic_id" TEXT NOT NULL,
    "invited_by_staff_id" TEXT,

    CONSTRAINT "staff_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_schedule_doctor_id_idx" ON "doctor_schedule"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedule_doctor_id_day_of_week_key" ON "doctor_schedule"("doctor_id", "day_of_week");

-- CreateIndex
CREATE INDEX "doctor_time_off_doctor_id_idx" ON "doctor_time_off"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_time_off_start_date_end_date_idx" ON "doctor_time_off"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitation_token_key" ON "staff_invitation"("token");

-- CreateIndex
CREATE INDEX "staff_invitation_token_idx" ON "staff_invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitation_clinic_id_email_key" ON "staff_invitation"("clinic_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_clinic_staff_id_key" ON "doctor"("clinic_staff_id");

-- AddForeignKey
ALTER TABLE "doctor" ADD CONSTRAINT "doctor_clinic_staff_id_fkey" FOREIGN KEY ("clinic_staff_id") REFERENCES "clinic_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_time_off" ADD CONSTRAINT "doctor_time_off_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_invited_by_staff_id_fkey" FOREIGN KEY ("invited_by_staff_id") REFERENCES "clinic_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
