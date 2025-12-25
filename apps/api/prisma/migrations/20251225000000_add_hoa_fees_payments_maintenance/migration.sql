-- CreateEnum
CREATE TYPE "HOAFeeType" AS ENUM ('MONTHLY_DUES', 'SPECIAL_ASSESSMENT', 'LATE_FEE', 'VIOLATION_FEE', 'TRANSFER_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "HOAFeeStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "requestedByHomeownerId" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "HOAFee" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "homeownerId" UUID NOT NULL,
    "type" "HOAFeeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "HOAFeeStatus" NOT NULL DEFAULT 'PENDING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "lateFeeAmount" DECIMAL(12,2),
    "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeAppliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HOAFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HomeownerPayment" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "homeownerId" UUID NOT NULL,
    "hoaFeeId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeownerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HomeownerPaymentMethod" (
    "id" UUID NOT NULL,
    "homeownerId" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "last4" TEXT,
    "bankName" TEXT,
    "cardBrand" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeownerPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeownerPayment_stripePaymentIntentId_key" ON "HomeownerPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeownerPayment_stripeChargeId_key" ON "HomeownerPayment"("stripeChargeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeownerPaymentMethod_stripePaymentMethodId_key" ON "HomeownerPaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HOAFee_associationId_idx" ON "HOAFee"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HOAFee_homeownerId_idx" ON "HOAFee"("homeownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HOAFee_dueDate_idx" ON "HOAFee"("dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HOAFee_status_idx" ON "HOAFee"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HOAFee_isRecurring_idx" ON "HOAFee"("isRecurring");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPayment_associationId_idx" ON "HomeownerPayment"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPayment_homeownerId_idx" ON "HomeownerPayment"("homeownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPayment_hoaFeeId_idx" ON "HomeownerPayment"("hoaFeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPayment_stripePaymentIntentId_idx" ON "HomeownerPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPaymentMethod_homeownerId_idx" ON "HomeownerPaymentMethod"("homeownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPaymentMethod_associationId_idx" ON "HomeownerPaymentMethod"("associationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomeownerPaymentMethod_stripePaymentMethodId_idx" ON "HomeownerPaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkOrder_requestedByHomeownerId_idx" ON "WorkOrder"("requestedByHomeownerId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_requestedByHomeownerId_fkey" FOREIGN KEY ("requestedByHomeownerId") REFERENCES "Homeowner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HOAFee" ADD CONSTRAINT "HOAFee_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HOAFee" ADD CONSTRAINT "HOAFee_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPayment" ADD CONSTRAINT "HomeownerPayment_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPayment" ADD CONSTRAINT "HomeownerPayment_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPayment" ADD CONSTRAINT "HomeownerPayment_hoaFeeId_fkey" FOREIGN KEY ("hoaFeeId") REFERENCES "HOAFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPayment" ADD CONSTRAINT "HomeownerPayment_stripePaymentMethodId_fkey" FOREIGN KEY ("stripePaymentMethodId") REFERENCES "HomeownerPaymentMethod"("stripePaymentMethodId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPaymentMethod" ADD CONSTRAINT "HomeownerPaymentMethod_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerPaymentMethod" ADD CONSTRAINT "HomeownerPaymentMethod_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
