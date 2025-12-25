import { prisma } from './prisma.js';
import { HOAFeeStatus } from '@prisma/client';

/**
 * Calculate late fee for an overdue HOA fee
 * Default: 10% of original amount or $25 minimum, whichever is greater
 * Can be customized per association
 */
export function calculateLateFee(originalAmount: number, lateFeePercentage: number = 0.10, minimumLateFee: number = 25): number {
  const percentageFee = originalAmount * lateFeePercentage;
  return Math.max(percentageFee, minimumLateFee);
}

/**
 * Apply late fees to overdue HOA fees
 * This should be run daily via a cron job or scheduled task
 */
export async function applyLateFeesToOverdueFees(associationId?: string): Promise<{
  feesUpdated: number;
  totalLateFeesApplied: number;
}> {
  const now = new Date();
  const where: any = {
    status: {
      in: [HOAFeeStatus.PENDING, HOAFeeStatus.PARTIALLY_PAID],
    },
    dueDate: {
      lt: now, // Past due date
    },
    lateFeeApplied: false, // Only apply once
  };

  if (associationId) {
    where.associationId = associationId;
  }

  // Find all overdue fees that haven't had late fees applied
  const overdueFees = await prisma.hOAFee.findMany({
    where,
    include: {
      payments: {
        select: {
          amount: true,
        },
      },
      association: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  let feesUpdated = 0;
  let totalLateFeesApplied = 0;

  for (const fee of overdueFees) {
    // Calculate paid amount
    const paidAmount = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Number(fee.amount) - paidAmount;

    // Only apply late fee if there's still an outstanding balance
    if (remainingAmount > 0) {
      // Calculate late fee (10% of original amount or $25 minimum)
      const lateFeeAmount = calculateLateFee(Number(fee.amount));

      // Update fee with late fee
      await prisma.hOAFee.update({
        where: { id: fee.id },
        data: {
          lateFeeAmount: lateFeeAmount,
          lateFeeApplied: true,
          lateFeeAppliedAt: now,
          status: HOAFeeStatus.OVERDUE,
        },
      });

      // Update homeowner account balance
      await prisma.homeowner.update({
        where: { id: fee.homeownerId },
        data: {
          accountBalance: {
            increment: lateFeeAmount,
          },
        },
      });

      feesUpdated++;
      totalLateFeesApplied += lateFeeAmount;
    }
  }

  return {
    feesUpdated,
    totalLateFeesApplied,
  };
}

/**
 * Check and update fee statuses based on payments
 * This should be run after payments are processed
 */
export async function updateFeeStatuses(feeId: string): Promise<void> {
  const fee = await prisma.hOAFee.findUnique({
    where: { id: feeId },
    include: {
      payments: {
        select: {
          amount: true,
        },
      },
    },
  });

  if (!fee) {
    return;
  }

  const paidAmount = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(fee.amount) + Number(fee.lateFeeAmount || 0);
  const remainingAmount = totalAmount - paidAmount;

  let newStatus: HOAFeeStatus = fee.status;

  if (remainingAmount <= 0) {
    newStatus = HOAFeeStatus.PAID;
  } else if (paidAmount > 0) {
    newStatus = HOAFeeStatus.PARTIALLY_PAID;
  } else if (new Date() > fee.dueDate && fee.status === HOAFeeStatus.PENDING) {
    newStatus = HOAFeeStatus.OVERDUE;
  }

  if (newStatus !== fee.status) {
    await prisma.hOAFee.update({
      where: { id: fee.id },
      data: { status: newStatus },
    });
  }
}

