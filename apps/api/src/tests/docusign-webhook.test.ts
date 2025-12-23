import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock DocuSign and storage functions
vi.mock('../lib/docusign.js', () => ({
  downloadCompletedDocument: vi.fn(() => Promise.resolve()),
  getEnvelopeStatus: vi.fn(() => Promise.resolve({
    status: 'completed',
    statusDateTime: new Date().toISOString(),
    completedDateTime: new Date().toISOString(),
  })),
}));

vi.mock('../lib/storage.js', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.com')),
  uploadFile: vi.fn(() => Promise.resolve('documents/test.pdf')),
}));

const app = createApp();

describe('DocuSign Webhook Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testUnit: any;
  let testTenant: any;
  let testLease: any;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id);

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
        docusignEnvelopeId: 'envelope-123',
        signatureStatus: 'sent',
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

  describe('POST /api/docusign/webhook', () => {
    it('should handle completed status', async () => {
      const response = await request(app)
        .post('/api/docusign/webhook')
        .send({
          envelopeId: 'envelope-123',
          status: 'completed',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify lease status was updated
      const lease = await prisma.lease.findUnique({
        where: { id: testLease.id },
      });
      expect(lease?.signatureStatus).toBe('completed');
      expect(lease?.signedPdfUrl).toBeDefined();
    });

    it('should handle sent status', async () => {
      const response = await request(app)
        .post('/api/docusign/webhook')
        .send({
          envelopeId: 'envelope-123',
          status: 'sent',
        });

      expect(response.status).toBe(200);

      const lease = await prisma.lease.findUnique({
        where: { id: testLease.id },
      });
      expect(lease?.signatureStatus).toBe('sent');
    });

    it('should handle declined status', async () => {
      const response = await request(app)
        .post('/api/docusign/webhook')
        .send({
          envelopeId: 'envelope-123',
          status: 'declined',
        });

      expect(response.status).toBe(200);

      const lease = await prisma.lease.findUnique({
        where: { id: testLease.id },
      });
      expect(lease?.signatureStatus).toBe('declined');
    });

    it('should return 400 for missing envelopeId', async () => {
      const response = await request(app)
        .post('/api/docusign/webhook')
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .post('/api/docusign/webhook')
        .send({
          envelopeId: 'nonexistent-envelope',
          status: 'completed',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/docusign/check-status/:leaseId', () => {
    it('should check envelope status', async () => {
      const response = await request(app)
        .post(`/api/docusign/check-status/${testLease.id}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.envelopeId).toBe('envelope-123');
      expect(response.body.data.status).toBe('completed');
    });

    it('should return 404 for lease without envelope', async () => {
      const leaseWithoutEnvelope = await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentAmount: 1000,
          rentDueDay: 1,
          status: 'DRAFT',
          tenants: {
            create: {
              tenantId: testTenant.id,
              isPrimary: true,
            },
          },
        },
      });

      const response = await request(app)
        .post(`/api/docusign/check-status/${leaseWithoutEnvelope.id}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });
});

