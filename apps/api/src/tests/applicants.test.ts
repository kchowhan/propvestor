import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Applicants Routes', () => {
  let testUser: any;
  let testOrg: any;
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/applicants', () => {
    it('should list applicants', async () => {
      // Create an applicant (tenant with PROSPECT status)
      await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PROSPECT',
        },
      });

      const response = await request(app)
        .get('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].status).toBe('PROSPECT');
    });

    it('should return empty array when no applicants', async () => {
      const response = await request(app)
        .get('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/applicants', () => {
    it('should create a new applicant', async () => {
      const response = await request(app)
        .post('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-1234',
        })
        .expect(201);

      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.lastName).toBe('Smith');
      expect(response.body.data.email).toBe('jane@example.com');
      expect(response.body.data.status).toBe('PROSPECT');
    });

    it('should create applicant with property and unit', async () => {
      const response = await request(app)
        .post('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@example.com',
          propertyId: testProperty.id,
          unitId: testUnit.id,
        })
        .expect(201);

      expect(response.body.data.propertyId).toBe(testProperty.id);
      expect(response.body.data.unitId).toBe(testUnit.id);
      expect(response.body.data.property).toBeTruthy();
      expect(response.body.data.unit).toBeTruthy();
    });

    it('should reject if property does not belong to organization', async () => {
      const otherOrg = await createTestOrganization();
      const otherProperty = await prisma.property.create({
        data: {
          organizationId: otherOrg.id,
          name: 'Other Property',
          addressLine1: '456 Other St',
          city: 'Other City',
          state: 'CA',
          postalCode: '54321',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });

      await request(app)
        .post('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          propertyId: otherProperty.id,
        })
        .expect(404);
    });

    it('should reject if unit does not belong to organization', async () => {
      const otherOrg = await createTestOrganization();
      const otherProperty = await prisma.property.create({
        data: {
          organizationId: otherOrg.id,
          name: 'Other Property',
          addressLine1: '456 Other St',
          city: 'Other City',
          state: 'CA',
          postalCode: '54321',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });
      const otherUnit = await prisma.unit.create({
        data: {
          propertyId: otherProperty.id,
          name: 'Other Unit',
        },
      });

      await request(app)
        .post('/api/applicants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          unitId: otherUnit.id,
        })
        .expect(404);
    });
  });

  describe('GET /api/applicants/:id', () => {
    it('should get applicant by id', async () => {
      const applicant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Alice',
          lastName: 'Brown',
          email: 'alice@example.com',
          status: 'SCREENING',
        },
      });

      const response = await request(app)
        .get(`/api/applicants/${applicant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.id).toBe(applicant.id);
      expect(response.body.data.firstName).toBe('Alice');
    });

    it('should return 404 if applicant not found', async () => {
      await request(app)
        .get('/api/applicants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 404 if applicant is not in applicant status', async () => {
      const activeTenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Active',
          lastName: 'Tenant',
          email: 'active@example.com',
          status: 'ACTIVE',
        },
      });

      await request(app)
        .get(`/api/applicants/${activeTenant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PUT /api/applicants/:id', () => {
    it('should update applicant', async () => {
      const applicant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Original',
          lastName: 'Name',
          email: 'original@example.com',
          status: 'PROSPECT',
        },
      });

      const response = await request(app)
        .put(`/api/applicants/${applicant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          status: 'APPROVED',
        })
        .expect(200);

      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.status).toBe('APPROVED');
    });

    it('should return 404 if applicant not found', async () => {
      await request(app)
        .put('/api/applicants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
        })
        .expect(404);
    });
  });

  describe('POST /api/applicants/:id/convert-to-tenant', () => {
    it('should convert applicant to approved tenant', async () => {
      const applicant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Convert',
          lastName: 'Me',
          email: 'convert@example.com',
          status: 'PROSPECT',
        },
      });

      const response = await request(app)
        .post(`/api/applicants/${applicant.id}/convert-to-tenant`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.status).toBe('APPROVED');
    });

    it('should return 404 if applicant not found', async () => {
      await request(app)
        .post('/api/applicants/00000000-0000-0000-0000-000000000000/convert-to-tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});

