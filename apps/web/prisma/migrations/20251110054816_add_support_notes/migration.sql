-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('ISSUE', 'RESOLUTION', 'FOLLOW_UP', 'GENERAL');

-- CreateTable
CREATE TABLE "SupportNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "category" "NoteCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportNote_userId_idx" ON "SupportNote"("userId");

-- CreateIndex
CREATE INDEX "SupportNote_createdAt_idx" ON "SupportNote"("createdAt");

-- CreateIndex
CREATE INDEX "SupportNote_category_idx" ON "SupportNote"("category");

-- AddForeignKey
ALTER TABLE "SupportNote" ADD CONSTRAINT "SupportNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportNote" ADD CONSTRAINT "SupportNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
