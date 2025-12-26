import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { cleanupTestData, createTestOrganization } from './setup.js';

vi.mock('../lib/homeowner-stripe.js', () => ({
  createHomeownerSetupIntent: vi.fn(() => Promise.resolve({
    clientSecret: 'seti_test_123',
    setupIntentId: 'seti_123',
  })),
  attachHomeownerPaymentMethod: vi.fn(() => Promise.resolve({
    id: 'pm_test_123',
    stripePaymentMethodId: 'pm_123',
    type: 'card',
    last4: '1234',
    isDefault: false,
    isActive: true,
  })),
  listHomeownerPaymentMethods: vi.fn(() => Promise.resolve([])),
  deleteHomeownerPaymentMethod: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Homeowner Payment Methods Routes', () => {
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;
  let homeownerToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();

    testOrg = await createTestOrganization();

    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    testHomeowner = await prisma.homeowner.create({
      data: {
        associationId: testAssociation.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash,
      },
    });

    homeownerToken = jwt.sign(
      { homeownerId: testHomeowner.id, associationId: testAssociation.id },
      env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/homeowner-payment-methods/publishable-key', () => {
    it('should return publishable key', async () => {
      const response = await request(app)
        .get('/api/homeowner-payment-methods/publishable-key');

      expect(response.status).toBe(200);
      expect(response.body.data.publishableKey).toBeDefined();
    });
  });

  describe('POST /api/homeowner-payment-methods/setup-intent', () => {
    it('should create setup intent', async () => {
      const response = await request(app)
        .post('/api/homeowner-payment-methods/setup-intent')
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.clientSecret).toBeDefined();
      expect(response.body.data.setupIntentId).toBeDefined();
    });
  });

  describe('POST /api/homeowner-payment-methods/attach', () => {
    it('should attach payment method', async () => {
      const response = await request(app)
        .post('/api/homeowner-payment-methods/attach')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send({
          setupIntentId: 'seti_test_123',
          isDefault: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/homeowner-payment-methods', () => {
    it('should list payment methods', async () => {
      const response = await request(app)
        .get('/api/homeowner-payment-methods')
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('DELETE /api/homeowner-payment-methods/:paymentMethodId', () => {
    it('should delete payment method', async () => {
      const uuid = require('crypto').randomUUID();
      const paymentMethod = await prisma.homeownerPaymentMethod.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          stripePaymentMethodId: `pm_test_${uuid}`,
          type: 'card',
          last4: '1234',
          isDefault: false,
          isActive: true,
        },
      });

      // The route uses stripePaymentMethodId in the URL, not the database id
      const response = await request(app)
        .delete(`/api/homeowner-payment-methods/${paymentMethod.stripePaymentMethodId}`)
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
    });
  });
});

