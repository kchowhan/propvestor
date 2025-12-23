import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

// Mock Stripe
vi.mock('../lib/stripe.js', () => ({
  createSetupIntent: vi.fn(() => Promise.resolve({
    clientSecret: 'seti_test_123',
    setupIntentId: 'seti_123',
  })),
  attachPaymentMethod: vi.fn(() => Promise.resolve({
    paymentMethodId: 'pm_123',
    type: 'us_bank_account',
    last4: '1234',
  })),
  listPaymentMethods: vi.fn(() => Promise.resolve([])),
  deletePaymentMethod: vi.fn(() => Promise.resolve()),
}));

describe('Payment Methods Routes', () => {
  beforeEach(() => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
  });

  afterEach(() => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
  });

  describe('GET /api/payment-methods/publishable-key', () => {
    it('should return publishable key when configured', async () => {
      const response = await request(app)
        .get('/api/payment-methods/publishable-key');

      expect(response.status).toBe(200);
      expect(response.body.data.publishableKey).toBe('pk_test_123');
    });

    it('should return 500 when not configured', async () => {
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      const response = await request(app)
        .get('/api/payment-methods/publishable-key');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('POST /api/payment-methods/setup-intent', () => {
    let testUser: any;
    let testOrg: any;
    let testTenant: any;
    let token: string;

    beforeEach(async () => {
      await cleanupTestData();

      testUser = await createTestUser();
      testOrg = await createTestOrganization();
      await createTestMembership(testUser.id, testOrg.id);
      token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      testTenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });
    });

    it('should create setup intent for valid tenant', async () => {
      const response = await request(app)
        .post('/api/payment-methods/setup-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ tenantId: testTenant.id });

      expect(response.status).toBe(200);
      expect(response.body.data.clientSecret).toBeDefined();
      expect(response.body.data.setupIntentId).toBeDefined();
    });

    it('should return 404 for invalid tenant', async () => {
      const response = await request(app)
        .post('/api/payment-methods/setup-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({ tenantId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/payment-methods/setup-intent')
        .send({ tenantId: testTenant.id });

      expect(response.status).toBe(401);
    });
  });
});

