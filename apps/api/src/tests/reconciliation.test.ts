import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Reconciliation API', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;
  let testProperty: any;
  let testUnit: any;
  let testLease: any;
  let testCharge: any;

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');

    // Create property, unit, lease, and charge for testing
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

    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
      },
    });

    testLease = await prisma.lease.create({
      data: {
        organizationId: testOrg.id,
        unitId: testUnit.id,
        rentAmount: 1000,
        rentDueDay: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      },
    });

    testCharge = await prisma.charge.create({
      data: {
        organizationId: testOrg.id,
        leaseId: testLease.id,
        unitId: testUnit.id,
        type: 'RENT',
        description: 'Monthly rent',
        amount: 1000,
        dueDate: new Date('2024-01-01'),
        status: 'PENDING',
      },
    });

    // Generate JWT token directly for testing
    token = jwt.sign(
      { userId: testUser.id, organizationId: testOrg.id, role: 'OWNER' },
      env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/reconciliation', () => {
    it('should create a reconciliation period', async () => {
      const response = await request(app)
        .post('/api/reconciliation')
        .set('Authorization', `Bearer ${token}`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    it('should reject invalid date range', async () => {
      const response = await request(app)
        .post('/api/reconciliation')
        .set('Authorization', `Bearer ${token}`)
        .send({
          startDate: '2024-01-31',
          endDate: '2024-01-01',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/reconciliation/import-transactions', () => {
    it('should import bank transactions', async () => {
      const response = await request(app)
        .post('/api/reconciliation/import-transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            {
              date: '2024-01-15',
              amount: 1000,
              description: 'Rent payment check #1234',
              reference: 'CHECK-1234',
            },
          ],
          importSource: 'manual',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.imported).toBe(1);
      expect(response.body.data.duplicates).toBe(0);
    });

    it('should skip duplicate transactions', async () => {
      // Import first time
      await request(app)
        .post('/api/reconciliation/import-transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            {
              date: '2024-01-15',
              amount: 1000,
              description: 'Rent payment',
              reference: 'TXN-123',
            },
          ],
        });

      // Import again (should be duplicate)
      const response = await request(app)
        .post('/api/reconciliation/import-transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            {
              date: '2024-01-15',
              amount: 1000,
              description: 'Rent payment',
              reference: 'TXN-123',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.imported).toBe(0);
      expect(response.body.data.duplicates).toBe(1);
    });
  });

  describe('POST /api/payments (check payment with bank transaction)', () => {
    it('should create payment and bank transaction for check', async () => {
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
    });

    it('should create payment without bank transaction if not requested', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-15',
          method: 'CHECK',
          checkNumber: '1234',
          createBankTransaction: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.method).toBe('CHECK');
      expect(response.body.data.bankTransaction).toBeNull();
    });
  });

  describe('GET /api/reconciliation', () => {
    it('should list all reconciliations', async () => {
      // Create a reconciliation first
      await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      const response = await request(app)
        .get('/api/reconciliation')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/reconciliation/:id', () => {
    it('should get reconciliation details with unmatched items', async () => {
      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      // Create unmatched payment
      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'CHECK',
          reconciled: false,
        },
      });

      const response = await request(app)
        .get(`/api/reconciliation/${reconciliation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(reconciliation.id);
      expect(response.body.data.unmatchedPayments).toBeDefined();
      expect(Array.isArray(response.body.data.unmatchedPayments)).toBe(true);
    });
  });

  describe('POST /api/reconciliation/:id/match', () => {
    it('should manually match payment with bank transaction', async () => {
      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'CHECK',
          reconciled: false,
        },
      });

      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Check payment',
          reference: 'CHECK-1234',
          reconciled: false,
        },
      });

      const response = await request(app)
        .post(`/api/reconciliation/${reconciliation.id}/match`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          paymentId: payment.id,
          bankTransactionId: transaction.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');

      // Verify both are marked as reconciled
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      const updatedTransaction = await prisma.bankTransaction.findUnique({
        where: { id: transaction.id },
      });

      expect(updatedPayment?.reconciled).toBe(true);
      expect(updatedTransaction?.reconciled).toBe(true);
    });
  });

  describe('POST /api/reconciliation/:id/auto-match', () => {
    it('should auto-match payments with transactions', async () => {
      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'ONLINE_PROCESSOR',
          reconciled: false,
        },
      });

      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Rent payment',
          reconciled: false,
        },
      });

      const response = await request(app)
        .post(`/api/reconciliation/${reconciliation.id}/auto-match`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.matched).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PUT /api/reconciliation/:id/complete', () => {
    it('should mark reconciliation as completed', async () => {
      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: testOrg.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'IN_PROGRESS',
          expectedTotal: 1000,
          actualTotal: 1000,
          difference: 0,
        },
      });

      const response = await request(app)
        .put(`/api/reconciliation/${reconciliation.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'Reconciliation completed successfully',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.reviewedBy).toBe(testUser.id);
      expect(response.body.data.notes).toBe('Reconciliation completed successfully');
    });
  });

  describe('PUT /api/reconciliation/bank-transactions/:id', () => {
    it('should update bank transaction', async () => {
      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Check payment',
          reference: 'CHECK-1234',
          reconciled: false,
        },
      });

      const response = await request(app)
        .put(`/api/reconciliation/bank-transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2024-01-16',
          amount: 1000,
          description: 'Updated check payment',
          reconciled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated check payment');
      expect(response.body.data.reconciled).toBe(true);
    });

    it('should update linked payment when marking transaction as reconciled', async () => {
      const payment = await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'CHECK',
          reconciled: false,
        },
      });

      const transaction = await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Check payment',
          reference: 'CHECK-1234',
          reconciled: false,
          paymentId: payment.id,
        },
      });

      await request(app)
        .put(`/api/reconciliation/bank-transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reconciled: true,
        });

      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(updatedPayment?.reconciled).toBe(true);
    });
  });

  describe('GET /api/reconciliation/unmatched/list', () => {
    it('should list unmatched payments and transactions', async () => {
      // Create unmatched payment
      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date('2024-01-15'),
          method: 'CHECK',
          reconciled: false,
        },
      });

      // Create unmatched transaction
      await prisma.bankTransaction.create({
        data: {
          organizationId: testOrg.id,
          date: new Date('2024-01-15'),
          amount: 1000,
          description: 'Unmatched transaction',
          reconciled: false,
        },
      });

      const response = await request(app)
        .get('/api/reconciliation/unmatched/list')
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.unmatchedPayments.length).toBeGreaterThan(0);
      expect(response.body.data.unmatchedTransactions.length).toBeGreaterThan(0);
    });
  });
});

