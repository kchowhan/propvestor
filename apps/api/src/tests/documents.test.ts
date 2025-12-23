import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock storage functions
vi.mock('../lib/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve('documents/test-file.pdf')),
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.com')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Documents Routes', () => {
  let testUser: any;
  let testOrg: any;
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/documents', () => {
    it('should return empty array when no documents exist', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/documents/upload', () => {
    it('should upload document', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('fileName', 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.data.fileName).toBe('test.pdf');
    });

    it('should return 400 when no file provided', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('fileName', 'test.pdf');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    let document: any;

    beforeEach(async () => {
      document = await prisma.document.create({
        data: {
          organizationId: testOrg.id,
          uploadedByUserId: testUser.id,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          storageKey: 'documents/test.pdf',
        },
      });
    });

    it('should return signed URL for document', async () => {
      const response = await request(app)
        .get(`/api/documents/${document.id}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.url).toBeDefined();
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let document: any;

    beforeEach(async () => {
      document = await prisma.document.create({
        data: {
          organizationId: testOrg.id,
          uploadedByUserId: testUser.id,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          storageKey: 'documents/test.pdf',
        },
      });
    });

    it('should delete document', async () => {
      const response = await request(app)
        .delete(`/api/documents/${document.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .delete('/api/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/documents (legacy endpoint)', () => {
    it('should create document record', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          storageKey: 'documents/test.pdf',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.fileName).toBe('test.pdf');
    });

    it('should create document with leaseId', async () => {
      const testProperty = await prisma.property.create({
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

      const testUnit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });

      const testTenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });

      const testLease = await prisma.lease.create({
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

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leaseId: testLease.id,
          fileName: 'lease.pdf',
          fileType: 'application/pdf',
          storageKey: 'leases/lease.pdf',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.leaseId).toBe(testLease.id);
    });
  });

  describe('POST /api/documents/upload with associations', () => {
    let testProperty: any;
    let testUnit: any;
    let testTenant: any;
    let testLease: any;

    beforeEach(async () => {
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

    it('should upload document with leaseId', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test content'), 'lease.pdf')
        .field('leaseId', testLease.id);

      expect(response.status).toBe(201);
      expect(response.body.data.leaseId).toBe(testLease.id);
    });

    it('should upload document with propertyId', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test content'), 'property.pdf')
        .field('propertyId', testProperty.id);

      expect(response.status).toBe(201);
      expect(response.body.data.propertyId).toBe(testProperty.id);
    });

    it('should upload document with tenantId', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test content'), 'tenant.pdf')
        .field('tenantId', testTenant.id);

      expect(response.status).toBe(201);
      expect(response.body.data.tenantId).toBe(testTenant.id);
    });
  });
});

