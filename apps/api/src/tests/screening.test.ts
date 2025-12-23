import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock RentSpree and email functions
vi.mock('../lib/rentspree.js', () => ({
  createScreeningApplication: vi.fn(() => Promise.resolve({
    applicationId: 'ext-123',
    applicationUrl: 'https://rentspree.com/app/123',
    status: 'PENDING',
  })),
  getApplicationStatus: vi.fn(() => Promise.resolve({
    status: 'COMPLETED',
    score: 750,
    flags: [],
  })),
}));

vi.mock('../lib/email.js', () => ({
  sendAdverseActionNotice: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Screening Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testUnit: any;
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
        status: 'PROSPECT',
        propertyId: testProperty.id,
        unitId: testUnit.id,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/screening/request', () => {
    it('should create screening request', async () => {
      const response = await request(app)
        .post('/api/screening/request')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenantId: testTenant.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.externalRequestId).toBe('ext-123');
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should return 400 for tenant without email', async () => {
      const tenantWithoutEmail = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Jane',
          lastName: 'Doe',
          status: 'PROSPECT',
        },
      });

      const response = await request(app)
        .post('/api/screening/request')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenantId: tenantWithoutEmail.id,
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid tenant', async () => {
      const response = await request(app)
        .post('/api/screening/request')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tenantId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/screening', () => {
    it('should return screening requests', async () => {
      await prisma.screeningRequest.create({
        data: {
          organizationId: testOrg.id,
          tenantId: testTenant.id,
          externalRequestId: 'ext-123',
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get(`/api/screening?tenantId=${testTenant.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});

