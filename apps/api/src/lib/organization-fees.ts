import { prisma } from './prisma.js';
import { AppError } from './errors.js';
import Stripe from 'stripe';

/**
 * Calculate Stripe processing fee based on payment method type and amount
 * Standard Stripe fees (as of 2024):
 * - Cards: 2.9% + $0.30
 * - ACH: $0.80 per transaction
 */
export function calculateStripeFee(amount: number, paymentMethodType: 'card' | 'ach'): number {
  if (paymentMethodType === 'card') {
    // 2.9% + $0.30
    return Math.round((amount * 0.029 + 0.30) * 100) / 100;
  } else {
    // ACH: $0.80 per transaction
    return 0.80;
  }
}

/**
 * Get actual Stripe fee from PaymentIntent
 * Stripe provides the fee in the balance_transaction
 */
export async function getStripeFeeFromPaymentIntent(
  paymentIntentId: string,
  stripeClient: Stripe
): Promise<number | null> {
  try {
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });

    const latestCharge = paymentIntent.latest_charge;
    if (!latestCharge || typeof latestCharge === 'string') {
      return null;
    }

    const balanceTransaction = latestCharge.balance_transaction;
    if (typeof balanceTransaction === 'string') {
      const bt = await stripeClient.balanceTransactions.retrieve(balanceTransaction);
      return Math.abs(bt.fee) / 100; // Convert from cents to dollars
    } else if (balanceTransaction) {
      return Math.abs(balanceTransaction.fee) / 100; // Convert from cents to dollars
    }

    return null;
  } catch (error) {
    console.error('Failed to get Stripe fee from payment intent:', error);
    return null;
  }
}

/**
 * Create organization fee for RentSpree screening
 */
export async function createRentSpreeScreeningFee(
  organizationId: string,
  screeningRequestId: string,
  feeAmount: number,
  description?: string
): Promise<string> {
  // Create organization fee record
  const organizationFee = await prisma.organizationFee.create({
    data: {
      organizationId,
      feeType: 'RENTSPREE_SCREENING',
      amount: feeAmount,
      description: description || `RentSpree background check screening fee`,
      screeningRequestId,
    },
  });

  // Create a charge for the organization to pay this fee
  const charge = await prisma.charge.create({
    data: {
      organizationId,
      type: 'SERVICE_FEE',
      description: `RentSpree screening fee - ${description || 'Background check'}`,
      amount: feeAmount,
      dueDate: new Date(), // Due immediately
      status: 'PENDING',
    },
  });

  // Link charge to organization fee
  await prisma.organizationFee.update({
    where: { id: organizationFee.id },
    data: { chargeId: charge.id },
  });

  return organizationFee.id;
}

/**
 * Create organization fee for Stripe processing
 */
export async function createStripeProcessingFee(
  organizationId: string,
  paymentId: string,
  paymentAmount: number,
  paymentMethodType: 'card' | 'ach',
  stripePaymentIntentId: string,
  actualStripeFee?: number // If we can get the actual fee from Stripe
): Promise<string> {
  // Calculate fee (use actual if available, otherwise estimate)
  const feeAmount = actualStripeFee ?? calculateStripeFee(paymentAmount, paymentMethodType);

  // Create organization fee record
  const organizationFee = await prisma.organizationFee.create({
    data: {
      organizationId,
      feeType: 'STRIPE_PROCESSING',
      amount: feeAmount,
      description: `Stripe ${paymentMethodType === 'card' ? 'card' : 'ACH'} processing fee for payment`,
      paymentId,
      stripeFeeAmount: actualStripeFee ?? undefined,
      stripeFeeType: paymentMethodType === 'card' ? 'processing_fee' : 'ach_fee',
    },
  });

  // Create a charge for the organization to pay this fee
  const charge = await prisma.charge.create({
    data: {
      organizationId,
      type: 'SERVICE_FEE',
      description: `Stripe ${paymentMethodType === 'card' ? 'card' : 'ACH'} processing fee`,
      amount: feeAmount,
      dueDate: new Date(), // Due immediately
      status: 'PENDING',
    },
  });

  // Link charge to organization fee
  await prisma.organizationFee.update({
    where: { id: organizationFee.id },
    data: { chargeId: charge.id },
  });

  return organizationFee.id;
}

/**
 * Get all organization fees for an organization
 */
export async function getOrganizationFees(
  organizationId: string,
  options?: {
    feeType?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return prisma.organizationFee.findMany({
    where: {
      organizationId,
      ...(options?.feeType ? { feeType: options.feeType } : {}),
      ...(options?.startDate || options?.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: options.startDate } : {}),
              ...(options.endDate ? { lte: options.endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      screeningRequest: {
        include: {
          tenant: true,
        },
      },
      payment: {
        include: {
          charge: true,
          lease: true,
        },
      },
      charge: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

