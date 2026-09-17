-- Notification.provider_ref — provider-side reference for a sent notification
-- (TextBee smsBatchId), so staff can trace a delivered SMS in the gateway's
-- message history. Nullable: only set on a successful send.

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "provider_ref" TEXT;