import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Tenants Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/tenants', () => {
    it('should return empty array when no tenants exist', async () => {
      const response = await request(app)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return tenants for organization', async () => {
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
        .get('/api/tenants')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].firstName).toBe('John');
    });

    it('should filter by status', async () => {
      await prisma.tenant.createMany({
        data: [
          {
            organizationId: testOrg.id,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: 'PROSPECT',
          },
          {
            organizationId: testOrg.id,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            status: 'ACTIVE',
          },
        ],
      });

      const response = await request(app)
        .get('/api/tenants?status=PROSPECT')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PROSPECT');
    });

    it('should support pagination', async () => {
      await prisma.tenant.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          organizationId: testOrg.id,
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@example.com`,
          status: 'PROSPECT',
        })),
      });

      const response = await request(app)
        .get('/api/tenants?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(5);
    });
  });

  describe('POST /api/tenants', () => {
    it('should create a new tenant', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.status).toBe('PROSPECT');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid property', async () => {
      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          propertyId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tenants/:id', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PROSPECT',
        },
      });
    });

    it('should return tenant by id', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(tenant.id);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .get('/api/tenants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tenants/:id', () => {
    let tenant: any;

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PROSPECT',
        },
      });
    });

    it('should update tenant', async () => {
      const response = await request(app)
        .put(`/api/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          status: 'ACTIVE',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .put('/api/tenants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
        });

      expect(response.status).toBe(404);
    });
  });
});

