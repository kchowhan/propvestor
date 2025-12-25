-- CreateEnum
CREATE TYPE "BoardMemberRole" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER_AT_LARGE');

-- CreateEnum
CREATE TYPE "HomeownerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELINQUENT', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "associations" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Association" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "fiscalYearStart" INTEGER DEFAULT 1,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Association_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Homeowner" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "unitId" UUID,
    "propertyId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "accountBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "HomeownerStatus" NOT NULL DEFAULT 'ACTIVE',
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationTokenExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homeowner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BoardMember" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "userId" UUID,
    "homeownerId" UUID,
    "role" "BoardMemberRole" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Association_organizationId_idx" ON "Association"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Association_isActive_idx" ON "Association"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Homeowner_associationId_idx" ON "Homeowner"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Homeowner_unitId_idx" ON "Homeowner"("unitId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Homeowner_propertyId_idx" ON "Homeowner"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Homeowner_status_idx" ON "Homeowner"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Homeowner_email_idx" ON "Homeowner"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardMember_associationId_idx" ON "BoardMember"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardMember_userId_idx" ON "BoardMember"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardMember_homeownerId_idx" ON "BoardMember"("homeownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BoardMember_isActive_idx" ON "BoardMember"("isActive");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "Homeowner_associationId_email_key" ON "Homeowner"("associationId", "email");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "Homeowner_emailVerificationToken_key" ON "Homeowner"("emailVerificationToken");

-- AddForeignKey
ALTER TABLE "Association" ADD CONSTRAINT "Association_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homeowner" ADD CONSTRAINT "Homeowner_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homeowner" ADD CONSTRAINT "Homeowner_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homeowner" ADD CONSTRAINT "Homeowner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove the temporary column we added
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "associations";
