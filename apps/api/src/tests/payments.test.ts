import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock Stripe functions
vi.mock('../lib/stripe.js', () => ({
  processPayment: vi.fn(() => Promise.resolve({
    paymentIntentId: 'pi_test_123',
    status: 'succeeded',
    clientSecret: 'pi_test_123_secret',
  })),
  getPaymentIntentStatus: vi.fn(() => Promise.resolve({
    status: 'succeeded',
    amount: 1000,
  })),
}));

const app = createApp();

describe('Payments Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testCharge: any;
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

    testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'SINGLE_FAMILY',
      },
    });

    testCharge = await prisma.charge.create({
      data: {
        organizationId: testOrg.id,
        propertyId: testProperty.id,
        type: 'RENT',
        description: 'Monthly rent',
        amount: 1000,
        dueDate: new Date(),
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/payments', () => {
    it('should return empty array when no payments exist', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toMatchObject({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return payments for organization', async () => {
      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].method).toBe('ONLINE_PROCESSOR');
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('POST /api/payments', () => {
    it('should create payment', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.method).toBe('ONLINE_PROCESSOR');
    });

    it('should return 404 for invalid charge', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: '00000000-0000-0000-0000-000000000000',
          amount: 1000,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      expect(response.status).toBe(404);
    });

    it('should create payment with check and bank transaction', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-15',
          method: 'CHECK',
          checkNumber: '1234',
          createBankTransaction: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.method).toBe('CHECK');
      expect(response.body.data.bankTransaction).not.toBeNull();
      expect(response.body.data.bankTransaction.reference).toBe('1234');
      expect(response.body.data.bankTransaction.reconciled).toBe(false);

      // Verify bank transaction was created in database
      const bankTransaction = await prisma.bankTransaction.findFirst({
        where: {
          organizationId: testOrg.id,
          reference: '1234',
        },
      });

      expect(bankTransaction).not.toBeNull();
      expect(Number(bankTransaction?.amount)).toBe(1000);
    });

    it('should create payment without bank transaction when not requested', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-15',
          method: 'CHECK',
          checkNumber: '5678',
          createBankTransaction: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.method).toBe('CHECK');
      expect(response.body.data.bankTransaction).toBeNull();
    });

    it('should update charge status when payment is created', async () => {
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      const charge = await prisma.charge.findUnique({
        where: { id: testCharge.id },
      });

      expect(charge?.status).toBe('PAID');
    });

    it('should handle partial payment', async () => {
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 500,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      const charge = await prisma.charge.findUnique({
        where: { id: testCharge.id },
      });

      expect(charge?.status).toBe('PARTIALLY_PAID');
    });
  });

  describe('GET /api/payments with tenantId filter', () => {
    let testTenant: any;
    let testLease: any;
    let testUnit: any;

    beforeEach(async () => {
      testUnit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });

      testTenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });

      testLease = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentAmount: 1000,
          rentDueDay: 1,
          status: 'ACTIVE',
          tenants: {
            create: {
              tenantId: testTenant.id,
              isPrimary: true,
            },
          },
        },
      });
    });

    it('should filter payments by tenantId', async () => {
      const charge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          leaseId: testLease.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });

      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: charge.id,
          leaseId: testLease.id,
          amount: 1000,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const response = await request(app)
        .get(`/api/payments?tenantId=${testTenant.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/payments/:id', () => {
    let payment: any;

    beforeEach(async () => {
      payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR',
        },
      });
    });

    it('should return payment by id', async () => {
      const response = await request(app)
        .get(`/api/payments/${payment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(payment.id);
      expect(response.body.data.charge).toBeDefined();
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/payments/process-stripe', () => {
    it('should process payment via Stripe', async () => {
      const response = await request(app)
        .post('/api/payments/process-stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          paymentMethodId: 'pm_test_123',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.paymentIntent.id).toBe('pi_test_123');
      expect(response.body.data.paymentIntent.status).toBe('succeeded');
    });

    it('should return 404 for invalid charge', async () => {
      const response = await request(app)
        .post('/api/payments/process-stripe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: '00000000-0000-0000-0000-000000000000',
          paymentMethodId: 'pm_test_123',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payments/stripe-status/:paymentIntentId', () => {
    let payment: any;

    beforeEach(async () => {
      payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date(),
          method: 'STRIPE_ACH',
          stripePaymentIntentId: 'pi_test_123',
        },
      });
    });

    it('should return payment intent status', async () => {
      const response = await request(app)
        .get('/api/payments/stripe-status/pi_test_123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('succeeded');
    });

    it('should update charge status when payment succeeds', async () => {
      await request(app)
        .get('/api/payments/stripe-status/pi_test_123')
        .set('Authorization', `Bearer ${token}`);

      const charge = await prisma.charge.findUnique({
        where: { id: testCharge.id },
      });

      expect(charge?.status).toBe('PAID');
    });
  });
});
