import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('HOA Fees Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;
  let testProperty: any;
  let testUnit: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');
    token = jwt.sign(
      { userId: testUser.id, organizationId: testOrg.id },
      env.JWT_SECRET
    );

    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'MULTI_FAMILY',
      },
    });

    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
      },
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    testHomeowner = await prisma.homeowner.create({
      data: {
        associationId: testAssociation.id,
        unitId: testUnit.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/hoa-fees', () => {
    it('should list HOA fees', async () => {
      const fee = await prisma.hOAFee.create({
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

      const response = await request(app)
        .get('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(fee.id);
    });

    it('should filter fees by association', async () => {
      const fee = await prisma.hOAFee.create({
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

      const response = await request(app)
        .get(`/api/hoa-fees?associationId=${testAssociation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(fee.id);
    });

    it('should filter fees by status', async () => {
      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Pending fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Paid fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PAID',
        },
      });

      const response = await request(app)
        .get('/api/hoa-fees?status=PENDING')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('PENDING');
    });

    it('should filter fees by homeownerId', async () => {
      const otherHomeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          unitId: testUnit.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });

      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'John fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: otherHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Jane fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get(`/api/hoa-fees?homeownerId=${testHomeowner.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].homeownerId).toBe(testHomeowner.id);
    });

    it('should filter fees by type', async () => {
      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'SPECIAL_ASSESSMENT',
          description: 'Special assessment',
          amount: 500.0,
          dueDate: new Date(),
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get('/api/hoa-fees?type=SPECIAL_ASSESSMENT')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('SPECIAL_ASSESSMENT');
    });

    it('should filter fees by isRecurring', async () => {
      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Recurring fee',
          amount: 200.0,
          dueDate: new Date(),
          status: 'PENDING',
          isRecurring: true,
          recurringInterval: 'monthly',
        },
      });

      await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'SPECIAL_ASSESSMENT',
          description: 'One-time fee',
          amount: 500.0,
          dueDate: new Date(),
          status: 'PENDING',
          isRecurring: false,
        },
      });

      const response = await request(app)
        .get('/api/hoa-fees?isRecurring=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isRecurring).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple fees
      for (let i = 0; i < 5; i++) {
        await prisma.hOAFee.create({
          data: {
            associationId: testAssociation.id,
            homeownerId: testHomeowner.id,
            type: 'MONTHLY_DUES',
            description: `Fee ${i}`,
            amount: 200.0,
            dueDate: new Date(),
            status: 'PENDING',
          },
        });
      }

      const response = await request(app)
        .get('/api/hoa-fees?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should return 404 for non-existent association', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/hoa-fees?associationId=${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/hoa-fees/:id', () => {
    it('should get fee details', async () => {
      const fee = await prisma.hOAFee.create({
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

      const response = await request(app)
        .get(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(fee.id);
      expect(Number(response.body.data.amount)).toBe(200.0);
    });

    it('should return 404 for non-existent fee', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/hoa-fees/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should include payments in fee details', async () => {
      const fee = await prisma.hOAFee.create({
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

      await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          hoaFeeId: fee.id,
          amount: 100.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .get(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toBeDefined();
      expect(response.body.data.payments.length).toBe(1);
      expect(Number(response.body.data.paidAmount)).toBe(100.0);
      expect(Number(response.body.data.remainingAmount)).toBe(100.0);
    });
  });

  describe('POST /api/hoa-fees', () => {
    it('should create HOA fee', async () => {
      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 200.0,
          dueDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('MONTHLY_DUES');
      expect(Number(response.body.data.amount)).toBe(200.0);
    });

    it('should create recurring fee', async () => {
      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 200.0,
          dueDate: new Date().toISOString(),
          isRecurring: true,
          recurringInterval: 'monthly',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurringInterval).toBe('monthly');
    });

    it('should create quarterly recurring fee', async () => {
      const dueDate = new Date();
      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Quarterly HOA fee',
          amount: 600.0,
          dueDate: dueDate.toISOString(),
          isRecurring: true,
          recurringInterval: 'quarterly',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurringInterval).toBe('quarterly');
      expect(response.body.data.nextDueDate).toBeDefined();
    });

    it('should create annually recurring fee', async () => {
      const dueDate = new Date();
      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Annual HOA fee',
          amount: 2400.0,
          dueDate: dueDate.toISOString(),
          isRecurring: true,
          recurringInterval: 'annually',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurringInterval).toBe('annually');
      expect(response.body.data.nextDueDate).toBeDefined();
    });

    it('should return 404 for non-existent association', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: fakeId,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 200.0,
          dueDate: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 for homeowner not in association', async () => {
      const otherAssociation = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Other HOA',
        },
      });

      const otherHomeowner = await prisma.homeowner.create({
        data: {
          associationId: otherAssociation.id,
          unitId: testUnit.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });

      const response = await request(app)
        .post('/api/hoa-fees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: otherHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 200.0,
          dueDate: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/hoa-fees/:id', () => {
    it('should update HOA fee', async () => {
      const fee = await prisma.hOAFee.create({
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

      const response = await request(app)
        .put(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'PAID',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('PAID');
    });

    it('should apply late fee', async () => {
      const fee = await prisma.hOAFee.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          type: 'MONTHLY_DUES',
          description: 'Monthly HOA fee',
          amount: 200.0,
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          status: 'OVERDUE',
        },
      });

      const response = await request(app)
        .put(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          lateFeeAmount: 25.0,
          lateFeeApplied: true,
        });

      expect(response.status).toBe(200);
      expect(Number(response.body.data.lateFeeAmount)).toBe(25.0);
      expect(response.body.data.lateFeeApplied).toBe(true);
    });

    it('should update fee amount and adjust homeowner balance', async () => {
      const fee = await prisma.hOAFee.create({
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

      const initialBalance = testHomeowner.accountBalance || 0;

      const response = await request(app)
        .put(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 250.0,
        });

      expect(response.status).toBe(200);
      expect(Number(response.body.data.amount)).toBe(250.0);

      // Verify homeowner balance was adjusted
      const updatedHomeowner = await prisma.homeowner.findUnique({
        where: { id: testHomeowner.id },
      });
      const expectedBalance = Number(initialBalance) + 50.0;
      expect(Number(updatedHomeowner?.accountBalance)).toBeCloseTo(expectedBalance, 2);
    });

    it('should update due date', async () => {
      const fee = await prisma.hOAFee.create({
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

      const newDueDate = new Date();
      newDueDate.setMonth(newDueDate.getMonth() + 1);

      const response = await request(app)
        .put(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          dueDate: newDueDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(new Date(response.body.data.dueDate).getTime()).toBeCloseTo(newDueDate.getTime(), -3);
    });

    it('should return 404 for non-existent fee', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/hoa-fees/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'PAID',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/hoa-fees/:id', () => {
    it('should delete HOA fee', async () => {
      const fee = await prisma.hOAFee.create({
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

      const response = await request(app)
        .delete(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const deleted = await prisma.hOAFee.findUnique({
        where: { id: fee.id },
      });
      expect(deleted).toBeNull();
    });

    it('should cancel fee with payments instead of deleting', async () => {
      const fee = await prisma.hOAFee.create({
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

      await prisma.homeownerPayment.create({
        data: {
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          hoaFeeId: fee.id,
          amount: 100.0,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR' as any,
        },
      });

      const response = await request(app)
        .delete(`/api/hoa-fees/${fee.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Fee should be cancelled, not deleted
      const cancelled = await prisma.hOAFee.findUnique({
        where: { id: fee.id },
      });
      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe('CANCELLED');
    });

    it('should return 404 for non-existent fee', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/hoa-fees/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

