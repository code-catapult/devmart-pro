-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ActivityLog_archived_createdAt_idx" ON "ActivityLog"("archived", "createdAt");
