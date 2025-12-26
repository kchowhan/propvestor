import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { cleanupTestData, createTestOrganization } from './setup.js';

vi.mock('../lib/homeowner-stripe.js', () => ({
  processHomeownerPayment: vi.fn(() => Promise.resolve({
    paymentIntentId: 'pi_test_123',
    chargeId: 'ch_test_123',
    customerId: 'cus_test_123',
  })),
}));

const app = createApp();

describe('Homeowner Payments Routes', () => {
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;
  let testHOAFee: any;
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

    testHOAFee = await prisma.hOAFee.create({
      data: {
        associationId: testAssociation.id,
        homeownerId: testHomeowner.id,
        type: 'MONTHLY_DUES',
        description: 'Monthly HOA fee',
        amount: 200.0,
        dueDate: new Date(),
        status: 'PENDING',
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

  describe('GET /api/homeowner-payments', () => {
    it('should list payments for homeowner', async () => {
      const payment = await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          hoaFeeId: testHOAFee.id,
          amount: 200.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .get('/api/homeowner-payments')
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(payment.id);
    });

    it('should filter payments by hoaFeeId', async () => {
      const payment = await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          hoaFeeId: testHOAFee.id,
          amount: 200.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .get(`/api/homeowner-payments?hoaFeeId=${testHOAFee.id}`)
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(payment.id);
    });
  });

  describe('GET /api/homeowner-payments/:id', () => {
    it('should get payment details', async () => {
      const payment = await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          hoaFeeId: testHOAFee.id,
          amount: 200.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .get(`/api/homeowner-payments/${payment.id}`)
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(payment.id);
      expect(Number(response.body.data.amount)).toBe(200.0);
    });

    it('should return 404 if homeowner tries to access other payment', async () => {
      const otherHomeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });

      const payment = await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: otherHomeowner.id,
          hoaFeeId: testHOAFee.id,
          amount: 200.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .get(`/api/homeowner-payments/${payment.id}`)
        .set('Authorization', `Bearer ${homeownerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/homeowner-payments', () => {
    it('should create payment for HOA fee', async () => {
      const response = await request(app)
        .post('/api/homeowner-payments/process')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send({
          hoaFeeId: testHOAFee.id,
          amount: 200.0,
          paymentMethodId: 'pm_test_123',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.payment).toBeDefined();
      expect(Number(response.body.data.payment.amount)).toBe(200.0);
    });
  });
});

