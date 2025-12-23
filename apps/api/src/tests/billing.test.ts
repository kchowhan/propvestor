import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock Stripe functions
const mockFindBestPaymentMethod = vi.fn(() => Promise.resolve(null));
const mockProcessPayment = vi.fn(() => Promise.resolve({ status: 'succeeded' }));

vi.mock('../lib/stripe.js', () => ({
  findBestPaymentMethodForCharge: (...args: any[]) => mockFindBestPaymentMethod(...args),
  processPayment: (...args: any[]) => mockProcessPayment(...args),
}));

const app = createApp();

describe('Billing Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testUnit: any;
  let testTenant: any;
  let testLease: any;
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

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/billing/generate-monthly-rent', () => {
    it('should generate rent charges for active leases', async () => {
      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.created).toBeGreaterThan(0);
    });

    it('should not create duplicate charges', async () => {
      // Create first charge
      await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      // Try to create again
      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.skipped).toBeGreaterThan(0);
    });

    it('should work with scheduler secret', async () => {
      // Set env var before making request
      const originalSecret = process.env.SCHEDULER_SECRET;
      process.env.SCHEDULER_SECRET = 'test-secret';

      try {
        const response = await request(app)
          .post('/api/billing/generate-monthly-rent')
          .set('x-scheduler-secret', 'test-secret') // Use lowercase header name
          .send({
            month: 1,
            year: 2024,
          });

        expect(response.status).toBe(200);
      } finally {
        // Restore original value
        if (originalSecret) {
          process.env.SCHEDULER_SECRET = originalSecret;
        } else {
          delete process.env.SCHEDULER_SECRET;
        }
      }
    });

    it('should return 401 without auth or scheduler secret', async () => {
      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(401);
    });

    it('should process payment when payment method is available', async () => {
      // Mock finding a payment method
      mockFindBestPaymentMethod.mockResolvedValueOnce({
        paymentMethodId: 'pm_test_123',
        tenantId: testTenant.id,
        tenantName: 'John Doe',
      });

      // Mock successful payment
      mockProcessPayment.mockResolvedValueOnce({
        paymentIntentId: 'pi_test_123',
        status: 'succeeded',
      });

      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 2,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.paymentsProcessed).toBeGreaterThan(0);
    });

    it('should handle payment processing failure gracefully', async () => {
      // Mock finding a payment method
      mockFindBestPaymentMethod.mockResolvedValueOnce({
        paymentMethodId: 'pm_test_123',
        tenantId: testTenant.id,
        tenantName: 'John Doe',
      });

      // Mock payment failure
      mockProcessPayment.mockRejectedValueOnce(new Error('Payment failed'));

      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 3,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.created).toBeGreaterThan(0);
      expect(response.body.data.paymentsFailed).toBeGreaterThan(0);
    });

    it('should handle payment status requires_action', async () => {
      // Mock finding a payment method
      mockFindBestPaymentMethod.mockResolvedValueOnce({
        paymentMethodId: 'pm_test_123',
        tenantId: testTenant.id,
        tenantName: 'John Doe',
      });

      // Mock payment requiring action
      mockProcessPayment.mockResolvedValueOnce({
        paymentIntentId: 'pi_test_123',
        status: 'requires_action',
        clientSecret: 'pi_test_123_secret',
      });

      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 4,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.paymentsProcessed).toBeGreaterThan(0);
    });

    it('should handle payment status processing', async () => {
      // Mock finding a payment method
      mockFindBestPaymentMethod.mockResolvedValueOnce({
        paymentMethodId: 'pm_test_123',
        tenantId: testTenant.id,
        tenantName: 'John Doe',
      });

      // Mock payment processing
      mockProcessPayment.mockResolvedValueOnce({
        paymentIntentId: 'pi_test_123',
        status: 'processing',
      });

      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 5,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.paymentsProcessed).toBeGreaterThan(0);
    });

    it('should handle payment status failed', async () => {
      // Mock finding a payment method
      mockFindBestPaymentMethod.mockResolvedValueOnce({
        paymentMethodId: 'pm_test_123',
        tenantId: testTenant.id,
        tenantName: 'John Doe',
      });

      // Mock payment failed
      mockProcessPayment.mockResolvedValueOnce({
        paymentIntentId: 'pi_test_123',
        status: 'failed',
      });

      const response = await request(app)
        .post('/api/billing/generate-monthly-rent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 6,
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.paymentsFailed).toBeGreaterThan(0);
      expect(response.body.data.paymentErrors).toBeDefined();
    });
  });
});

