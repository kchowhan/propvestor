import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock PDF and DocuSign functions
vi.mock('../lib/pdf.js', () => ({
  generateAndUploadLeasePdf: vi.fn(() => Promise.resolve({
    storageKey: 'documents/lease-test.pdf',
    url: 'https://storage.example.com/lease-test.pdf',
  })),
  generateLeasePdf: vi.fn(() => Promise.resolve(Buffer.from('fake-pdf-content'))),
}));

vi.mock('../lib/docusign.js', () => ({
  sendEnvelope: vi.fn(() => Promise.resolve('envelope-123')),
  downloadCompletedDocument: vi.fn(() => Promise.resolve(Buffer.from('signed-pdf'))),
}));

vi.mock('../lib/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve('documents/test-file.pdf')),
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.com')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Leases Routes', () => {
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
        status: 'ACTIVE',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/leases', () => {
    it('should return empty array when no leases exist', async () => {
      const response = await request(app)
        .get('/api/leases')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return leases for organization', async () => {
      const lease = await prisma.lease.create({
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
        .get('/api/leases')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(lease.id);
    });
  });

  describe('POST /api/leases', () => {
    it('should create draft lease', async () => {
      const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          unitId: testUnit.id,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          rentAmount: 1000,
          rentDueDay: 1,
          tenantIds: [testTenant.id],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.tenants.length).toBe(1);
    });

    it('should auto-assign primary tenant if not specified', async () => {
      const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          unitId: testUnit.id,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          rentAmount: 1000,
          rentDueDay: 1,
          tenantIds: [testTenant.id],
        });

      expect(response.status).toBe(201);
      const primaryTenant = response.body.data.tenants.find((t: any) => t.isPrimary);
      expect(primaryTenant).toBeDefined();
      expect(primaryTenant.tenantId).toBe(testTenant.id);
    });

    it('should prevent overlapping active leases', async () => {
      // Create existing active lease
      await prisma.lease.create({
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

      // Try to create overlapping active lease
      const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          unitId: testUnit.id,
          startDate: '2024-06-01',
          endDate: '2025-06-01',
          rentAmount: 1000,
          rentDueDay: 1,
          status: 'ACTIVE',
          tenantIds: [testTenant.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already has an active lease');
    });

    it('should return 404 for invalid unit', async () => {
      const response = await request(app)
        .post('/api/leases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          unitId: '00000000-0000-0000-0000-000000000000',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          rentAmount: 1000,
          rentDueDay: 1,
          tenantIds: [testTenant.id],
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leases/:id/activate', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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
    });

    it('should activate lease', async () => {
      const response = await request(app)
        .post(`/api/leases/${lease.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('should update unit status to OCCUPIED', async () => {
      await request(app)
        .post(`/api/leases/${lease.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      const unit = await prisma.unit.findUnique({
        where: { id: testUnit.id },
      });

      expect(unit?.status).toBe('OCCUPIED');
    });

    it('should prevent activating if overlapping active lease exists', async () => {
      // Create another active lease for same unit
      await prisma.lease.create({
        data: {
          organizationId: testOrg.id,
          unitId: testUnit.id,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2025-06-01'),
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
        .post(`/api/leases/${lease.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/leases/:id/terminate', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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
      await prisma.unit.update({
        where: { id: testUnit.id },
        data: { status: 'OCCUPIED' },
      });
    });

    it('should terminate lease', async () => {
      const response = await request(app)
        .post(`/api/leases/${lease.id}/terminate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('TERMINATED');
    });

    it('should update unit status to VACANT', async () => {
      await request(app)
        .post(`/api/leases/${lease.id}/terminate`)
        .set('Authorization', `Bearer ${token}`);

      const unit = await prisma.unit.findUnique({
        where: { id: testUnit.id },
      });

      expect(unit?.status).toBe('VACANT');
    });
  });

  describe('GET /api/leases/:id', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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

    it('should return lease by id', async () => {
      const response = await request(app)
        .get(`/api/leases/${lease.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(lease.id);
      expect(response.body.data.tenants).toBeDefined();
      expect(response.body.data.unit).toBeDefined();
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .get('/api/leases/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/leases/:id', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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
    });

    it('should update lease', async () => {
      const response = await request(app)
        .put(`/api/leases/${lease.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          rentAmount: 1200,
          rentDueDay: 5,
        });

      expect(response.status).toBe(200);
      expect(Number(response.body.data.rentAmount)).toBe(1200);
      expect(response.body.data.rentDueDay).toBe(5);
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .put('/api/leases/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rentAmount: 1200,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leases/:id/generate-rent-charge', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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

    it('should generate rent charge for lease', async () => {
      const response = await request(app)
        .post(`/api/leases/${lease.id}/generate-rent-charge`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('RENT');
      expect(Number(response.body.data.amount)).toBe(1000);
    });

    it('should return 409 for duplicate charge', async () => {
      // Create first charge
      await request(app)
        .post(`/api/leases/${lease.id}/generate-rent-charge`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      // Try to create duplicate
      const response = await request(app)
        .post(`/api/leases/${lease.id}/generate-rent-charge`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(409);
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .post('/api/leases/00000000-0000-0000-0000-000000000000/generate-rent-charge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leases/:id/generate-pdf', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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

    it('should generate PDF for lease', async () => {
      const response = await request(app)
        .post(`/api/leases/${lease.id}/generate-pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.data.documentId).toBeDefined();
      expect(response.body.data.url).toBeDefined();
      expect(response.body.data.message).toBe('PDF generated successfully');
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .post('/api/leases/00000000-0000-0000-0000-000000000000/generate-pdf')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leases/:id/send-for-signature', () => {
    let lease: any;

    beforeEach(async () => {
      lease = await prisma.lease.create({
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

    it('should send lease for signature', async () => {
      const response = await request(app)
        .post(`/api/leases/${lease.id}/send-for-signature`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emailSubject: 'Please sign your lease',
          emailBlurb: 'Please review and sign.',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.envelopeId).toBe('envelope-123');
      expect(response.body.data.status).toBe('sent');
    });

    it('should return 400 if already sent for signature', async () => {
      // First send
      await prisma.lease.update({
        where: { id: lease.id },
        data: {
          docusignEnvelopeId: 'existing-envelope',
          signatureStatus: 'sent',
        },
      });

      // Try to send again
      const response = await request(app)
        .post(`/api/leases/${lease.id}/send-for-signature`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been sent');
    });

    it('should return 400 if tenant has no email', async () => {
      // Update tenant to remove email
      await prisma.tenant.update({
        where: { id: testTenant.id },
        data: { email: null },
      });

      const response = await request(app)
        .post(`/api/leases/${lease.id}/send-for-signature`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email address');
    });

    it('should return 404 for non-existent lease', async () => {
      const response = await request(app)
        .post('/api/leases/00000000-0000-0000-0000-000000000000/send-for-signature')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

