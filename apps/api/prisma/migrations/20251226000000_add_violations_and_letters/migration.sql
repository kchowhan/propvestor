-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViolationLetterType" AS ENUM ('FIRST_NOTICE', 'SECOND_NOTICE', 'FINAL_NOTICE', 'HEARING_NOTICE', 'CUSTOM');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "violationId" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Violation" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "homeownerId" UUID NOT NULL,
    "unitId" UUID,
    "propertyId" UUID,
    "type" TEXT NOT NULL,
    "severity" "ViolationSeverity" NOT NULL DEFAULT 'MINOR',
    "description" TEXT NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'OPEN',
    "violationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedDate" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ViolationLetter" (
    "id" UUID NOT NULL,
    "violationId" UUID NOT NULL,
    "letterType" "ViolationLetterType" NOT NULL DEFAULT 'FIRST_NOTICE',
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3),
    "sentByUserId" UUID,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "pdfStorageKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViolationLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_violationId_idx" ON "Document"("violationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_associationId_idx" ON "Violation"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_homeownerId_idx" ON "Violation"("homeownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_unitId_idx" ON "Violation"("unitId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_propertyId_idx" ON "Violation"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_status_idx" ON "Violation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_violationDate_idx" ON "Violation"("violationDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Violation_createdByUserId_idx" ON "Violation"("createdByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ViolationLetter_violationId_idx" ON "ViolationLetter"("violationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ViolationLetter_sentDate_idx" ON "ViolationLetter"("sentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ViolationLetter_letterType_idx" ON "ViolationLetter"("letterType");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViolationLetter" ADD CONSTRAINT "ViolationLetter_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViolationLetter" ADD CONSTRAINT "ViolationLetter_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

