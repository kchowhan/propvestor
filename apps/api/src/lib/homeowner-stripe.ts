import Stripe from 'stripe';
import { prisma } from './prisma.js';
import { AppError } from './errors.js';
import { getStripeClient } from './stripe.js';

/**
 * Create or retrieve Stripe customer for a homeowner
 */
export async function getOrCreateHomeownerStripeCustomer(homeownerId: string): Promise<string> {
  const homeowner = await prisma.homeowner.findUnique({
    where: { id: homeownerId },
    include: {
      association: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!homeowner) {
    throw new AppError(404, 'NOT_FOUND', 'Homeowner not found');
  }

  // Check if homeowner already has a Stripe customer ID stored
  // Note: We might need to add stripeCustomerId to Homeowner model if not present
  // For now, we'll create a customer each time (Stripe handles duplicates by email)
  
  // Create new Stripe customer
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: homeowner.email,
    name: `${homeowner.firstName} ${homeowner.lastName}`,
    metadata: {
      homeownerId,
      associationId: homeowner.associationId,
      organizationId: homeowner.association.organizationId,
    },
  });

  // Note: If we add stripeCustomerId to Homeowner model, update it here
  // await prisma.homeowner.update({
  //   where: { id: homeownerId },
  //   data: { stripeCustomerId: customer.id },
  // });

  return customer.id;
}

/**
 * Create payment method setup intent for homeowner
 */
export async function createHomeownerSetupIntent(homeownerId: string): Promise<{
  clientSecret: string;
  setupIntentId: string;
}> {
  const customerId = await getOrCreateHomeownerStripeCustomer(homeownerId);
  const stripe = getStripeClient();

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['us_bank_account', 'card'],
    usage: 'off_session', // For recurring payments
  });

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Attach payment method to homeowner customer and save to database
 */
export async function attachHomeownerPaymentMethod(
  homeownerId: string,
  associationId: string,
  setupIntentId: string,
  isDefault: boolean = false
): Promise<{
  paymentMethodId: string;
  type: string;
  last4: string;
  bankName?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
}> {
  const stripe = getStripeClient();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

  if (setupIntent.status !== 'succeeded') {
    throw new AppError(400, 'BAD_REQUEST', 'Setup intent not completed');
  }

  const paymentMethodId = setupIntent.payment_method as string;
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  const homeowner = await prisma.homeowner.findUnique({
    where: { id: homeownerId },
  });

  if (!homeowner) {
    throw new AppError(404, 'NOT_FOUND', 'Homeowner not found');
  }

  const customerId = await getOrCreateHomeownerStripeCustomer(homeownerId);

  // Attach to Stripe customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // If this is the default, unset other defaults
  if (isDefault) {
    await prisma.homeownerPaymentMethod.updateMany({
      where: { homeownerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Extract payment method details
  const type = paymentMethod.type;
  let last4: string | undefined;
  let bankName: string | undefined;
  let cardBrand: string | undefined;
  let cardExpMonth: number | undefined;
  let cardExpYear: number | undefined;

  if (paymentMethod.us_bank_account) {
    last4 = paymentMethod.us_bank_account.last4 ?? undefined;
    bankName = paymentMethod.us_bank_account.bank_name ?? undefined;
  } else if (paymentMethod.card) {
    last4 = paymentMethod.card.last4;
    cardBrand = paymentMethod.card.brand;
    cardExpMonth = paymentMethod.card.exp_month;
    cardExpYear = paymentMethod.card.exp_year;
  }

  // Save to database
  const saved = await prisma.homeownerPaymentMethod.create({
    data: {
      homeownerId,
      associationId,
      stripePaymentMethodId: paymentMethodId,
      type,
      isDefault,
      last4: last4 || undefined,
      bankName: bankName || undefined,
      cardBrand: cardBrand || undefined,
      cardExpMonth: cardExpMonth || undefined,
      cardExpYear: cardExpYear || undefined,
      isActive: true,
    },
  });

  return {
    paymentMethodId: saved.stripePaymentMethodId,
    type: saved.type,
    last4: saved.last4 || '',
    bankName: saved.bankName || undefined,
    cardBrand: saved.cardBrand || undefined,
    cardExpMonth: saved.cardExpMonth || undefined,
    cardExpYear: saved.cardExpYear || undefined,
  };
}

/**
 * List payment methods for a homeowner
 */
export async function listHomeownerPaymentMethods(homeownerId: string): Promise<Array<{
  id: string;
  stripePaymentMethodId: string;
  type: string;
  last4?: string;
  bankName?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isDefault: boolean;
  isActive: boolean;
}>> {
  const methods = await prisma.homeownerPaymentMethod.findMany({
    where: {
      homeownerId,
      isActive: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return methods.map((m) => ({
    id: m.id,
    stripePaymentMethodId: m.stripePaymentMethodId,
    type: m.type,
    last4: m.last4 || undefined,
    bankName: m.bankName || undefined,
    cardBrand: m.cardBrand || undefined,
    cardExpMonth: m.cardExpMonth || undefined,
    cardExpYear: m.cardExpYear || undefined,
    isDefault: m.isDefault,
    isActive: m.isActive,
  }));
}

/**
 * Delete payment method for homeowner
 */
export async function deleteHomeownerPaymentMethod(paymentMethodId: string): Promise<void> {
  const paymentMethod = await prisma.homeownerPaymentMethod.findUnique({
    where: { stripePaymentMethodId: paymentMethodId },
  });

  if (!paymentMethod) {
    throw new AppError(404, 'NOT_FOUND', 'Payment method not found');
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateHomeownerStripeCustomer(paymentMethod.homeownerId);

  // Detach from Stripe customer
  try {
    await stripe.paymentMethods.detach(paymentMethodId);
  } catch (err: any) {
    // If already detached, that's fine
    if (err.code !== 'resource_missing') {
      throw err;
    }
  }

  // Mark as inactive in database
  await prisma.homeownerPaymentMethod.update({
    where: { stripePaymentMethodId: paymentMethodId },
    data: { isActive: false },
  });
}

/**
 * Process payment for an HOA fee using stored payment method
 */
export async function processHomeownerPayment(
  hoaFeeId: string,
  paymentMethodId: string,
  amount: number
): Promise<{
  paymentIntentId: string;
  status: string;
  clientSecret?: string;
}> {
  const fee = await prisma.hOAFee.findUnique({
    where: { id: hoaFeeId },
    include: {
      homeowner: true,
      association: true,
    },
  });

  if (!fee) {
    throw new AppError(404, 'NOT_FOUND', 'HOA fee not found');
  }

  // Verify payment method exists and is active
  const paymentMethod = await prisma.homeownerPaymentMethod.findUnique({
    where: { stripePaymentMethodId: paymentMethodId },
    include: { homeowner: true },
  });

  if (!paymentMethod || !paymentMethod.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Payment method not found or inactive');
  }

  // Verify the payment method belongs to the homeowner who owes this fee
  if (paymentMethod.homeownerId !== fee.homeownerId) {
    throw new AppError(400, 'BAD_REQUEST', 'Payment method does not belong to the homeowner who owes this fee');
  }

  const customerId = await getOrCreateHomeownerStripeCustomer(fee.homeownerId);
  const stripe = getStripeClient();

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    confirmation_method: 'automatic',
    confirm: true,
    off_session: true, // For recurring payments
    metadata: {
      hoaFeeId,
      homeownerId: fee.homeownerId,
      associationId: fee.associationId,
      organizationId: fee.association.organizationId,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    clientSecret: paymentIntent.client_secret || undefined,
  };
}

