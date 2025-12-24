import Stripe from 'stripe';
import { prisma } from './prisma.js';
import { AppError } from './errors.js';
import { getStripeClient } from './stripe.js';

/**
 * Get or create Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(organizationId: string): Promise<string> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });

  if (!organization) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  // Return existing customer ID if available
  if (organization.subscription?.stripeCustomerId) {
    return organization.subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    name: organization.name,
    metadata: {
      organizationId,
    },
  });

  // Update subscription with customer ID if it exists
  if (organization.subscription) {
    await prisma.subscription.update({
      where: { id: organization.subscription.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  return customer.id;
}

/**
 * Create Stripe subscription for organization
 */
export async function createStripeSubscription(
  organizationId: string,
  planId: string,
  paymentMethodId?: string
): Promise<{
  subscriptionId: string;
  stripeSubscriptionId: string;
  status: string;
  clientSecret?: string;
}> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription plan not found or inactive');
  }

  if (!plan.stripePriceId) {
    throw new AppError(400, 'BAD_REQUEST', 'Plan does not have a Stripe price ID configured');
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });

  if (!organization) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  // If organization already has an active subscription, cancel it first
  if (organization.subscription && organization.subscription.status === 'ACTIVE') {
    throw new AppError(400, 'BAD_REQUEST', 'Organization already has an active subscription');
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomer(organizationId);

  // Create Stripe subscription
  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    metadata: {
      organizationId,
      planId,
    },
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  };

  // If payment method provided, attach it
  if (paymentMethodId) {
    subscriptionData.default_payment_method = paymentMethodId;
  }

  const stripeSubscription = await stripe.subscriptions.create(subscriptionData);

  // Calculate trial end date (14 days from now)
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // Calculate billing period
  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

  // Create or update subscription in database
  let subscription;
  if (organization.subscription) {
    subscription = await prisma.subscription.update({
      where: { id: organization.subscription.id },
      data: {
        planId: plan.id,
        status: stripeSubscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt: stripeSubscription.status === 'trialing' ? trialEndsAt : null,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: stripeSubscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt: stripeSubscription.status === 'trialing' ? trialEndsAt : null,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
      },
    });
  }

  // Get client secret from invoice if available
  const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
  const clientSecret = paymentIntent?.client_secret;

  return {
    subscriptionId: subscription.id,
    stripeSubscriptionId: stripeSubscription.id,
    status: subscription.status,
    clientSecret,
  };
}

/**
 * Update subscription plan (upgrade/downgrade)
 */
export async function updateSubscriptionPlan(
  organizationId: string,
  newPlanId: string
): Promise<{ subscriptionId: string; status: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription not found');
  }

  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
    throw new AppError(400, 'BAD_REQUEST', 'Can only change plan for active or trial subscriptions');
  }

  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: newPlanId },
  });

  if (!newPlan || !newPlan.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'New plan not found or inactive');
  }

  if (!newPlan.stripePriceId) {
    throw new AppError(400, 'BAD_REQUEST', 'New plan does not have a Stripe price ID configured');
  }

  if (subscription.planId === newPlanId) {
    throw new AppError(400, 'BAD_REQUEST', 'Organization is already on this plan');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'BAD_REQUEST', 'Subscription does not have a Stripe subscription ID');
  }

  const stripe = getStripeClient();

  // Get current subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

  // Update subscription item to new price
  const subscriptionItem = stripeSubscription.items.data[0];
  await stripe.subscriptionItems.update(subscriptionItem.id, {
    price: newPlan.stripePriceId,
    proration_behavior: 'create_prorations', // Prorate the difference
  });

  // Update subscription in database
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: newPlan.id,
      // Status remains the same unless it's past due
    },
  });

  return {
    subscriptionId: updated.id,
    status: updated.status,
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  organizationId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{ subscriptionId: string; status: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription not found');
  }

  if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
    throw new AppError(400, 'BAD_REQUEST', 'Subscription is already cancelled or expired');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'BAD_REQUEST', 'Subscription does not have a Stripe subscription ID');
  }

  const stripe = getStripeClient();

  if (cancelAtPeriodEnd) {
    // Schedule cancellation at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return {
      subscriptionId: updated.id,
      status: updated.status,
    };
  } else {
    // Cancel immediately
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelAtPeriodEnd: false,
      },
    });

    return {
      subscriptionId: updated.id,
      status: updated.status,
    };
  }
}

/**
 * Get current subscription for organization
 */
export async function getCurrentSubscription(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      plan: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  return subscription;
}

/**
 * Sync subscription status from Stripe
 */
export async function syncSubscriptionFromStripe(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripeClient();
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!subscription) {
    console.warn(`Subscription not found for Stripe subscription: ${stripeSubscriptionId}`);
    return;
  }

  // Map Stripe status to our status
  let status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE';
  if (stripeSubscription.status === 'trialing') {
    status = 'TRIAL';
  } else if (stripeSubscription.status === 'active') {
    status = 'ACTIVE';
  } else if (stripeSubscription.status === 'past_due') {
    status = 'PAST_DUE';
  } else if (stripeSubscription.status === 'canceled' || stripeSubscription.cancel_at_period_end) {
    status = 'CANCELLED';
  } else if (stripeSubscription.status === 'unpaid' || stripeSubscription.status === 'incomplete_expired') {
    status = 'EXPIRED';
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
      trialEndsAt: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
  });
}

/**
 * Get subscription plan limits for organization
 */
export async function getSubscriptionLimits(organizationId: string): Promise<{
  properties: number;
  tenants: number;
  users: number;
  storage: number; // in MB
  apiCalls: number; // per hour
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  if (!subscription || !subscription.plan) {
    // Default to Free plan limits if no subscription
    return {
      properties: 1,
      tenants: 5,
      users: 2,
      storage: 100, // 100 MB
      apiCalls: 100, // 100 per hour
    };
  }

  const limits = subscription.plan.limits as any;
  return {
    properties: limits?.properties || 999999,
    tenants: limits?.tenants || 999999,
    users: limits?.users || 999999,
    storage: limits?.storage || 999999,
    apiCalls: limits?.apiCalls || 999999,
  };
}

