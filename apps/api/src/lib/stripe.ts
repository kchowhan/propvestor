import Stripe from 'stripe';
import { AppError } from './errors.js';
import { prisma } from './prisma.js';

// Initialize Stripe client
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe secret key not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeClient;
}

/**
 * Create or retrieve Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  }

  // Return existing customer ID if available
  if (tenant.stripeCustomerId) {
    return tenant.stripeCustomerId;
  }

  // Create new Stripe customer
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: tenant.email || undefined,
    name: `${tenant.firstName} ${tenant.lastName}`,
    metadata: {
      tenantId,
      organizationId: tenant.organizationId,
    },
  });

  // Update tenant with Stripe customer ID
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create payment method setup intent for ACH/bank account
 */
export async function createSetupIntent(tenantId: string): Promise<{
  clientSecret: string;
  setupIntentId: string;
}> {
  const customerId = await getOrCreateStripeCustomer(tenantId);
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
 * Attach payment method to customer and save to database
 */
export async function attachPaymentMethod(
  tenantId: string,
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
  }

  // Attach to Stripe customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: tenant.stripeCustomerId!,
  });

  // If this is the default, unset other defaults
  if (isDefault) {
    await prisma.tenantPaymentMethod.updateMany({
      where: { tenantId, isDefault: true },
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
    last4 = paymentMethod.us_bank_account.last4;
    bankName = paymentMethod.us_bank_account.bank_name;
  } else if (paymentMethod.card) {
    last4 = paymentMethod.card.last4;
    cardBrand = paymentMethod.card.brand;
    cardExpMonth = paymentMethod.card.exp_month;
    cardExpYear = paymentMethod.card.exp_year;
  }

  // Save to database
  const saved = await prisma.tenantPaymentMethod.create({
    data: {
      tenantId,
      organizationId: tenant.organizationId,
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
 * Process payment for a charge using stored payment method
 * Tries primary tenant first, then falls back to other tenants if needed
 */
export async function processPayment(
  chargeId: string,
  paymentMethodId: string,
  amount: number
): Promise<{
  paymentIntentId: string;
  status: string;
  clientSecret?: string;
}> {
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: { lease: { include: { tenants: { include: { tenant: true } } } } },
  });

  if (!charge || !charge.lease) {
    throw new AppError(404, 'NOT_FOUND', 'Charge or lease not found');
  }

  // Verify payment method exists and is active
  const paymentMethod = await prisma.tenantPaymentMethod.findUnique({
    where: { stripePaymentMethodId: paymentMethodId },
    include: { tenant: true },
  });

  if (!paymentMethod || !paymentMethod.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Payment method not found or inactive');
  }

  // Verify the payment method belongs to a tenant on this lease
  const leaseTenant = charge.lease.tenants.find((lt) => lt.tenantId === paymentMethod.tenantId);
  if (!leaseTenant) {
    throw new AppError(400, 'BAD_REQUEST', 'Payment method does not belong to a tenant on this lease');
  }

  const tenant = paymentMethod.tenant;
  if (!tenant || !tenant.stripeCustomerId) {
    throw new AppError(400, 'BAD_REQUEST', 'Tenant does not have a Stripe customer');
  }

  const stripe = getStripeClient();

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: tenant.stripeCustomerId,
    payment_method: paymentMethodId,
    confirmation_method: 'automatic',
    confirm: true,
    off_session: true, // For recurring payments
    metadata: {
      chargeId,
      leaseId: charge.leaseId || '',
      tenantId: tenant.id,
      organizationId: charge.organizationId,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    clientSecret: paymentIntent.client_secret || undefined,
  };
}

/**
 * Find the best payment method for a charge (primary tenant first, then others)
 * Returns the payment method ID and tenant ID
 */
export async function findBestPaymentMethodForCharge(chargeId: string): Promise<{
  paymentMethodId: string;
  tenantId: string;
  tenantName: string;
} | null> {
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: { lease: { include: { tenants: { include: { tenant: true } } } } },
  });

  if (!charge || !charge.lease) {
    return null;
  }

  // Sort tenants: primary first, then others
  const sortedTenants = [...charge.lease.tenants].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return 0;
  });

  // Try each tenant's default payment method in order
  for (const leaseTenant of sortedTenants) {
    const tenant = leaseTenant.tenant;
    if (!tenant) continue;

    // Find default payment method for this tenant
    const defaultPaymentMethod = await prisma.tenantPaymentMethod.findFirst({
      where: {
        tenantId: tenant.id,
        isDefault: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (defaultPaymentMethod) {
      return {
        paymentMethodId: defaultPaymentMethod.stripePaymentMethodId,
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
      };
    }

    // If no default, try any active payment method
    const anyPaymentMethod = await prisma.tenantPaymentMethod.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (anyPaymentMethod) {
      return {
        paymentMethodId: anyPaymentMethod.stripePaymentMethodId,
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
      };
    }
  }

  return null;
}

/**
 * Get payment intent status
 */
export async function getPaymentIntentStatus(paymentIntentId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
}> {
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency,
  };
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const paymentMethod = await prisma.tenantPaymentMethod.findUnique({
    where: { stripePaymentMethodId: paymentMethodId },
  });

  if (!paymentMethod) {
    throw new AppError(404, 'NOT_FOUND', 'Payment method not found');
  }

  const stripe = getStripeClient();

  try {
    // Detach from Stripe customer
    await stripe.paymentMethods.detach(paymentMethodId);
  } catch (error: any) {
    // Ignore if already detached
    if (error.code !== 'resource_missing') {
      throw error;
    }
  }

  // Mark as inactive in database
  await prisma.tenantPaymentMethod.update({
    where: { stripePaymentMethodId: paymentMethodId },
    data: { isActive: false },
  });
}

/**
 * List payment methods for a tenant
 */
export async function listPaymentMethods(tenantId: string) {
  return prisma.tenantPaymentMethod.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

