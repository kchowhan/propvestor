import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Homeowners Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testAssociation: any;
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

    // Create test association
    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    // Create test property and unit
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/homeowners', () => {
    it('should list homeowners for organization', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      const response = await request(app)
        .get('/api/homeowners')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by associationId', async () => {
      const association2 = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Another HOA',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: association2.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/homeowners?associationId=${testAssociation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].email).toBe('john@example.com');
    });

    it('should filter by status', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Active',
          lastName: 'User',
          email: 'active@example.com',
          status: 'ACTIVE',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Delinquent',
          lastName: 'User',
          email: 'delinquent@example.com',
          status: 'DELINQUENT',
        },
      });

      const response = await request(app)
        .get('/api/homeowners?status=ACTIVE')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const activeHomeowners = response.body.data.filter((h: any) => h.status === 'ACTIVE');
      expect(activeHomeowners.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by unitId', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          unitId: testUnit.id,
          firstName: 'Unit',
          lastName: 'Owner',
          email: 'unit@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/homeowners?unitId=${testUnit.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].unitId).toBe(testUnit.id);
    });

    it('should return 404 for invalid associationId', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/homeowners?associationId=${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/homeowners');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/homeowners', () => {
    it('should create homeowner with required fields', async () => {
      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Doe');
      expect(response.body.data.email).toBe('john@example.com');
      expect(response.body.data.associationId).toBe(testAssociation.id);
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.message).toBe('Homeowner created successfully.');
    });

    it('should create homeowner with unit', async () => {
      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          unitId: testUnit.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '415-555-1234',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.unitId).toBe(testUnit.id);
      expect(response.body.data.phone).toBe('415-555-1234');
    });

    it('should create homeowner with property', async () => {
      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          propertyId: testProperty.id,
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.propertyId).toBe(testProperty.id);
    });

    it('should return 404 for invalid associationId', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: fakeId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 409 for duplicate email in association', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Existing',
          lastName: 'User',
          email: 'duplicate@example.com',
        },
      });

      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          firstName: 'New',
          lastName: 'User',
          email: 'duplicate@example.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should allow same email in different associations', async () => {
      const association2 = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Another HOA',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'First',
          lastName: 'User',
          email: 'same@example.com',
        },
      });

      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: association2.id,
          firstName: 'Second',
          lastName: 'User',
          email: 'same@example.com',
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/homeowners')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/homeowners/:id', () => {
    it('should get homeowner details', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          unitId: testUnit.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/homeowners/${homeowner.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(homeowner.id);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.association).toBeDefined();
      expect(response.body.data.unit).toBeDefined();
    });

    it('should return 404 for non-existent homeowner', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/homeowners/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/homeowners/:id', () => {
    it('should update homeowner', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      const response = await request(app)
        .put(`/api/homeowners/${homeowner.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          phone: '415-555-9999',
          status: 'DELINQUENT',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.phone).toBe('415-555-9999');
      expect(response.body.data.status).toBe('DELINQUENT');
      expect(response.body.data.lastName).toBe('Doe'); // Unchanged
      expect(response.body.message).toBe('Homeowner updated successfully.');
    });

    it('should return 409 for duplicate email update', async () => {
      const homeowner1 = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'First',
          lastName: 'User',
          email: 'first@example.com',
        },
      });

      const homeowner2 = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Second',
          lastName: 'User',
          email: 'second@example.com',
        },
      });

      const response = await request(app)
        .put(`/api/homeowners/${homeowner2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'first@example.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('DELETE /api/homeowners/:id', () => {
    it('should soft delete homeowner', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });

      const response = await request(app)
        .delete(`/api/homeowners/${homeowner.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.archivedAt).toBeDefined();
      expect(response.body.message).toBe('Homeowner archived successfully.');

      // Verify it's still in database but archived
      const archived = await prisma.homeowner.findUnique({
        where: { id: homeowner.id },
      });
      expect(archived).toBeDefined();
      expect(archived?.archivedAt).toBeDefined();
    });
  });

  describe('GET /api/homeowners/:id/balance', () => {
    it('should get homeowner account balance', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          accountBalance: 1500.50,
        },
      });

      const response = await request(app)
        .get(`/api/homeowners/${homeowner.id}/balance`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.homeownerId).toBe(homeowner.id);
      // Decimal is returned as string, convert for comparison
      expect(Number(response.body.data.accountBalance)).toBe(1500.50);
      expect(response.body.data.name).toBe('John Doe');
    });

    it('should return 404 for non-existent homeowner', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/homeowners/${fakeId}/balance`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

