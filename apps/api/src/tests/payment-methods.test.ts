import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    id: 'pm_123',
    stripePaymentMethodId: 'pm_123',
    type: 'us_bank_account',
    last4: '1234',
    isDefault: false,
    isActive: true,
  })),
  listPaymentMethods: vi.fn(() => Promise.resolve([])),
  deletePaymentMethod: vi.fn(() => Promise.resolve()),
}));

describe('Payment Methods Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testTenant: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

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

  afterEach(async () => {
    await cleanupTestData();
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

  describe('POST /api/payment-methods/attach', () => {
    it('should attach payment method', async () => {
      const response = await request(app)
        .post('/api/payment-methods/attach')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenantId: testTenant.id,
          setupIntentId: 'seti_123',
          isDefault: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.stripePaymentMethodId).toBe('pm_123');
    });

    it('should return 404 for invalid tenant', async () => {
      const response = await request(app)
        .post('/api/payment-methods/attach')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenantId: '00000000-0000-0000-0000-000000000000',
          setupIntentId: 'seti_123',
        });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/payment-methods/attach')
        .send({
          tenantId: testTenant.id,
          setupIntentId: 'seti_123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payment-methods/tenant/:tenantId', () => {
    it('should list payment methods for tenant', async () => {
      const response = await request(app)
        .get(`/api/payment-methods/tenant/${testTenant.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for invalid tenant', async () => {
      const response = await request(app)
        .get('/api/payment-methods/tenant/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .get(`/api/payment-methods/tenant/${testTenant.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/payment-methods/:paymentMethodId', () => {
    let paymentMethod: any;

    beforeEach(async () => {
      paymentMethod = await prisma.tenantPaymentMethod.create({
        data: {
          organizationId: testOrg.id,
          tenantId: testTenant.id,
          stripePaymentMethodId: 'pm_test_123',
          type: 'us_bank_account',
          last4: '1234',
          isDefault: false,
          isActive: true,
        },
      });
    });

    it('should delete payment method', async () => {
      const response = await request(app)
        .delete(`/api/payment-methods/${paymentMethod.stripePaymentMethodId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent payment method', async () => {
      const response = await request(app)
        .delete('/api/payment-methods/pm_nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .delete(`/api/payment-methods/${paymentMethod.stripePaymentMethodId}`);

      expect(response.status).toBe(401);
    });
  });
});

