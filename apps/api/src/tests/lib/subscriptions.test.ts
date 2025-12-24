import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';
import {
  getCurrentSubscription,
  getSubscriptionLimits,
  syncSubscriptionFromStripe,
} from '../../lib/subscriptions.js';

// Mock Stripe
vi.mock('../../lib/stripe.js', () => ({
  getStripeClient: vi.fn(() => ({
    subscriptions: {
      retrieve: vi.fn(() =>
        Promise.resolve({
          id: 'sub_test_123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          cancel_at_period_end: false,
          trial_end: null,
        })
      ),
    },
  })),
}));

describe('Subscription Library', () => {
  let testOrg: any;
  let freePlan: any;
  let basicPlan: any;

  beforeEach(async () => {
    await cleanupTestData();
    testOrg = await createTestOrganization();

    // Use unique slugs to avoid conflicts
    const uuid = require('crypto').randomUUID().slice(0, 8);

    freePlan = await prisma.subscriptionPlan.upsert({
      where: { slug: `free-test-${uuid}` },
      create: {
        name: 'Free Test',
        slug: `free-test-${uuid}`,
        price: 0,
        billingInterval: 'monthly',
        features: { properties: true },
        limits: { properties: 1, tenants: 5, users: 2, storage: 100, apiCalls: 100 },
        isActive: true,
        displayOrder: 0,
      },
      update: {},
    });

    basicPlan = await prisma.subscriptionPlan.upsert({
      where: { slug: `basic-test-${uuid}` },
      create: {
        name: 'Basic Test',
        slug: `basic-test-${uuid}`,
        price: 49,
        billingInterval: 'monthly',
        features: { properties: true, reports: true },
        limits: { properties: 10, tenants: 50, users: 5, storage: 1000, apiCalls: 1000 },
        isActive: true,
        displayOrder: 1,
      },
      update: {},
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('getCurrentSubscription', () => {
    it('should return null if no subscription exists', async () => {
      const subscription = await getCurrentSubscription(testOrg.id);
      expect(subscription).toBeNull();
    });

    it('should return subscription with plan and invoices', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.invoice.create({
        data: {
          subscriptionId: subscription.id,
          amount: 49,
          status: 'PAID',
          dueDate: new Date(),
          paidAt: new Date(),
        },
      });

      const result = await getCurrentSubscription(testOrg.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(subscription.id);
      expect(result?.plan).toBeDefined();
      expect(result?.invoices).toBeDefined();
      expect(result?.invoices.length).toBe(1);
    });
  });

  describe('getSubscriptionLimits', () => {
    it('should return default limits if no subscription', async () => {
      const limits = await getSubscriptionLimits(testOrg.id);

      expect(limits.properties).toBe(1);
      expect(limits.tenants).toBe(5);
      expect(limits.users).toBe(2);
      expect(limits.storage).toBe(100);
      expect(limits.apiCalls).toBe(100);
    });

    it('should return plan limits if subscription exists', async () => {
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const limits = await getSubscriptionLimits(testOrg.id);

      expect(limits.properties).toBe(10);
      expect(limits.tenants).toBe(50);
      expect(limits.users).toBe(5);
      expect(limits.storage).toBe(1000);
      expect(limits.apiCalls).toBe(1000);
    });
  });

  describe('syncSubscriptionFromStripe', () => {
    it('should sync subscription status from Stripe', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'TRIAL',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test_123',
        },
      });

      await syncSubscriptionFromStripe('sub_test_123');

      const updated = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      expect(updated?.status).toBe('ACTIVE');
    });

    it('should handle missing subscription gracefully', async () => {
      await expect(syncSubscriptionFromStripe('nonexistent')).resolves.not.toThrow();
    });
  });
});

