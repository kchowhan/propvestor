import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock RentSpree functions
vi.mock('../lib/rentspree.js', () => ({
  verifyWebhookSignature: vi.fn(() => true),
}));

const app = createApp();

describe('RentSpree Webhook Routes', () => {
  let testOrg: any;
  let testProperty: any;
  let testUnit: any;
  let testTenant: any;
  let testScreeningRequest: any;

  beforeEach(async () => {
    await cleanupTestData();
    process.env.RENTSPREE_WEBHOOK_SECRET = 'webhook-secret-123';

    testOrg = await createTestOrganization();
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
        phone: '1234567890',
        status: 'SCREENING',
      },
    });

    testScreeningRequest = await prisma.screeningRequest.create({
      data: {
        organizationId: testOrg.id,
        tenantId: testTenant.id,
        externalRequestId: 'rentspree-123',
        status: 'PENDING',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
    delete process.env.RENTSPREE_WEBHOOK_SECRET;
  });

  describe('POST /api/rentspree/webhook', () => {
    it('should handle completed screening with approved status', async () => {
      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          applicationId: 'rentspree-123',
          status: 'COMPLETED',
          recommendation: 'APPROVED',
          creditScore: 750,
          incomeVerified: true,
          evictionHistory: false,
          criminalHistory: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify screening request was updated
      const screening = await prisma.screeningRequest.findUnique({
        where: { id: testScreeningRequest.id },
      });
      expect(screening?.status).toBe('COMPLETED');
      expect(screening?.recommendation).toBe('APPROVED');
      expect(screening?.creditScore).toBe(750);

      // Verify tenant status was updated
      const tenant = await prisma.tenant.findUnique({
        where: { id: testTenant.id },
      });
      expect(tenant?.status).toBe('APPROVED');
    });

    it('should handle declined screening', async () => {
      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          applicationId: 'rentspree-123',
          status: 'DECLINED',
          recommendation: 'DECLINED',
          creditScore: 500,
        });

      expect(response.status).toBe(200);

      const tenant = await prisma.tenant.findUnique({
        where: { id: testTenant.id },
      });
      expect(tenant?.status).toBe('DECLINED');
    });

    it('should handle borderline recommendation', async () => {
      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          applicationId: 'rentspree-123',
          status: 'COMPLETED',
          recommendation: 'BORDERLINE',
          creditScore: 650,
        });

      expect(response.status).toBe(200);

      const screening = await prisma.screeningRequest.findUnique({
        where: { id: testScreeningRequest.id },
      });
      expect(screening?.recommendation).toBe('BORDERLINE');
    });

    it('should return 400 for missing applicationId', async () => {
      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent screening request', async () => {
      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          applicationId: 'nonexistent-123',
          status: 'COMPLETED',
        });

      expect(response.status).toBe(404);
    });

    it('should return 500 when webhook secret is not configured', async () => {
      delete process.env.RENTSPREE_WEBHOOK_SECRET;

      const response = await request(app)
        .post('/api/rentspree/webhook')
        .set('x-rentspree-signature', 'test-signature')
        .send({
          applicationId: 'rentspree-123',
          status: 'COMPLETED',
        });

      expect(response.status).toBe(500);
    });
  });
});

