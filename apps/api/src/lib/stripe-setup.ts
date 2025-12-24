import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { AppError } from './errors.js';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripeInstance;
}

/**
 * Create or get Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  // If organization already has a Stripe customer, return it
  if (organization.stripeCustomerId) {
    return organization.stripeCustomerId;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
      organizationName: organization.name,
    },
  });

  // Update organization with Stripe customer ID
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a SetupIntent for collecting payment method
 */
export async function createPaymentSetupIntent(
  organizationId: string,
  email: string,
  name: string
): Promise<{ clientSecret: string; customerId: string }> {
  const customerId = await getOrCreateStripeCustomer(organizationId, email, name);

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: {
      organizationId,
      purpose: 'onboarding_payment_setup',
    },
  });

  return {
    clientSecret: setupIntent.client_secret!,
    customerId,
  };
}

/**
 * Set default payment method for organization
 */
export async function setDefaultPaymentMethod(
  organizationId: string,
  paymentMethodId: string
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization?.stripeCustomerId) {
    throw new AppError(400, 'BAD_REQUEST', 'No Stripe customer found for organization');
  }

  const stripe = getStripe();
  
  // Attach payment method to customer if not already attached
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: organization.stripeCustomerId,
    });
  } catch (error: any) {
    // If already attached, continue
    if (!error.message?.includes('already been attached')) {
      throw error;
    }
  }

  // Set as default payment method
  await stripe.customers.update(organization.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Update organization record
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      defaultPaymentMethodId: paymentMethodId,
      paymentMethodSetupComplete: true,
    },
  });
}

/**
 * Get payment methods for organization
 */
export async function getOrganizationPaymentMethods(
  organizationId: string
): Promise<Stripe.PaymentMethod[]> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization?.stripeCustomerId) {
    return [];
  }

  const stripe = getStripe();
  const paymentMethods = await stripe.paymentMethods.list({
    customer: organization.stripeCustomerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(paymentMethodId: string): Promise<void> {
  const stripe = getStripe();
  await stripe.paymentMethods.detach(paymentMethodId);
}

