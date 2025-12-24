import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock Stripe
const mockStripeSubscription = {
  id: 'sub_test_123',
  status: 'trialing',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
  trial_end: Math.floor(Date.now() / 1000) + 1209600, // 14 days
  cancel_at_period_end: false,
  items: {
    data: [{ id: 'si_test_123', price: { id: 'price_test_123' } }],
  },
  latest_invoice: {
    id: 'in_test_123',
    payment_intent: {
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
    },
  },
};

const mockStripeCustomer = {
  id: 'cus_test_123',
  name: 'Test Organization',
  metadata: { organizationId: 'org-123' },
};

vi.mock('../lib/stripe.js', () => ({
  getStripeClient: vi.fn(() => ({
    customers: {
      create: vi.fn(() => Promise.resolve(mockStripeCustomer)),
      retrieve: vi.fn(() => Promise.resolve(mockStripeCustomer)),
    },
    subscriptions: {
      create: vi.fn(() => Promise.resolve(mockStripeSubscription)),
      retrieve: vi.fn(() => Promise.resolve(mockStripeSubscription)),
      update: vi.fn(() => Promise.resolve(mockStripeSubscription)),
      cancel: vi.fn(() => Promise.resolve({ ...mockStripeSubscription, status: 'canceled' })),
    },
    subscriptionItems: {
      update: vi.fn(() => Promise.resolve({ id: 'si_test_123' })),
    },
    webhooks: {
      constructEvent: vi.fn((body, sig, secret) => {
        if (!secret) throw new Error('Webhook secret not configured');
        return { type: 'customer.subscription.created', data: { object: mockStripeSubscription } };
      }),
    },
  })),
}));

const app = createApp();

describe('Subscription API', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;
  let freePlan: any;
  let basicPlan: any;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');

    token = jwt.sign({ userId: testUser.id, organizationId: testOrg.id, role: 'OWNER' }, env.JWT_SECRET);

    // Create default plans with unique slugs
    const uuid = require('crypto').randomUUID().slice(0, 8);

    freePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Free Test',
        slug: `free-test-${uuid}`,
        price: 0,
        billingInterval: 'monthly',
        features: { properties: true, reports: false, api: false },
        limits: { properties: 1, tenants: 5, users: 2, storage: 100, apiCalls: 100 },
        isActive: true,
        displayOrder: 0,
      },
    });

    basicPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Basic Test',
        slug: `basic-test-${uuid}`,
        price: 49,
        billingInterval: 'monthly',
        features: { properties: true, reports: true, api: false },
        limits: { properties: 10, tenants: 50, users: 5, storage: 1000, apiCalls: 1000 },
        stripePriceId: `price_test_basic_${uuid}`,
        isActive: true,
        displayOrder: 1,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/subscriptions/plans', () => {
    it('should list all active subscription plans', async () => {
      const response = await request(app).get('/api/subscriptions/plans');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('price');
      expect(response.body.data[0]).toHaveProperty('limits');
    });

    it('should only return active plans', async () => {
      // Create inactive plan with unique slug
      const uuid = require('crypto').randomUUID().slice(0, 8);
      await prisma.subscriptionPlan.create({
        data: {
          name: 'Inactive Plan',
          slug: `inactive-${uuid}`,
          price: 99,
          billingInterval: 'monthly',
          features: {},
          limits: {},
          isActive: false,
        },
      });

      const response = await request(app).get('/api/subscriptions/plans');

      expect(response.status).toBe(200);
      const inactivePlan = response.body.data.find((p: any) => p.slug === 'inactive');
      expect(inactivePlan).toBeUndefined();
    });
  });

  describe('GET /api/subscriptions/current', () => {
    it('should return null if no subscription exists', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
    });

    it('should return current subscription with plan and invoices', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).not.toBeNull();
      expect(response.body.data.id).toBe(subscription.id);
      expect(response.body.data.plan).toBeDefined();
      expect(response.body.data.invoices).toBeDefined();
    });
  });

  describe('GET /api/subscriptions/limits', () => {
    it('should return default limits if no subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/limits')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.properties).toBe(1);
      expect(response.body.data.tenants).toBe(5);
      expect(response.body.data.users).toBe(2);
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

      const response = await request(app)
        .get('/api/subscriptions/limits')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.properties).toBe(10);
      expect(response.body.data.tenants).toBe(50);
      expect(response.body.data.users).toBe(5);
    });
  });

  describe('POST /api/subscriptions/subscribe', () => {
    it('should create subscription with trial', async () => {
      const response = await request(app)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: basicPlan.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.status).toBe('TRIAL');
      expect(response.body.data.subscription.planId).toBe(basicPlan.id);
    });

    it('should return 400 if plan not found', async () => {
      const response = await request(app)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if organization already has active subscription', async () => {
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: basicPlan.id,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/subscriptions/upgrade', () => {
    it('should upgrade subscription plan', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test_123',
        },
      });

      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: basicPlan.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.planId).toBe(basicPlan.id);
    });

    it('should return 400 if subscription not found', async () => {
      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: basicPlan.id,
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if already on the same plan', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: basicPlan.id,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    it('should cancel subscription at period end', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test_123',
        },
      });

      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cancelAtPeriodEnd: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: basicPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: 'sub_test_123',
        },
      });

      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cancelAtPeriodEnd: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.status).toBe('CANCELLED');
    });
  });

  describe('GET /api/subscriptions/invoices', () => {
    it('should return empty array if no subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/invoices')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return invoices for subscription', async () => {
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

      const response = await request(app)
        .get('/api/subscriptions/invoices')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PAID');
    });
  });
});

