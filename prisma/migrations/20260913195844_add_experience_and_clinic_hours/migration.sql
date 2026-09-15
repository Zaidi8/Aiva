-- Item 11 / Item 12: clinic opening hours + doctor years of experience.
--
--   clinic.opening_hours    JSONB [{ dayOfWeek, startTime, endTime }, ...]
--                           in the clinic timezone; rendered into the AI
--                           receptionist's prompt so it answers hours/closed-day
--                           questions from real data instead of guessing.
--   doctor.experience_years INTEGER (nullable) — years of practice; lets the AI
--                           recommend the senior-most doctor in a specialty.

-- AlterTable
ALTER TABLE "clinic" ADD COLUMN     "opening_hours" JSONB;

-- AlterTable
ALTER TABLE "doctor" ADD COLUMN     "experience_years" INTEGER;