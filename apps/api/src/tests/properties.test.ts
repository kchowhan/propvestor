import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Properties Routes', () => {
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

  describe('GET /api/properties', () => {
    it('should return empty array when no properties exist', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return properties for organization', async () => {
      await prisma.property.create({
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

      const response = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Test Property');
    });

    it('should filter by city', async () => {
      await prisma.property.createMany({
        data: [
          {
            organizationId: testOrg.id,
            name: 'Property 1',
            addressLine1: '123 Main St',
            city: 'City A',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
          {
            organizationId: testOrg.id,
            name: 'Property 2',
            addressLine1: '456 Oak St',
            city: 'City B',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
        ],
      });

      const response = await request(app)
        .get('/api/properties?city=City A')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].city).toBe('City A');
    });

    it('should support pagination', async () => {
      await prisma.property.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          organizationId: testOrg.id,
          name: `Property ${i + 1}`,
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        })),
      });

      const response = await request(app)
        .get('/api/properties?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should not return properties from other organizations', async () => {
      const otherOrg = await createTestOrganization( {
        name: 'Other Org',
        slug: 'other-org',
      });

      await prisma.property.createMany({
        data: [
          {
            organizationId: testOrg.id,
            name: 'My Property',
            addressLine1: '123 Main St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
          {
            organizationId: otherOrg.id,
            name: 'Other Property',
            addressLine1: '456 Oak St',
            city: 'Other City',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          },
        ],
      });

      const response = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('My Property');
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Property',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('New Property');
      expect(response.body.data.organizationId).toBe(testOrg.id);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).post('/api/properties').send({
        name: 'New Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'SINGLE_FAMILY',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/properties/:id', () => {
    let property: any;

    beforeEach(async () => {
      property = await prisma.property.create({
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

    it('should return property by id', async () => {
      const response = await request(app)
        .get(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(property.id);
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .get('/api/properties/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should not return property from other organization', async () => {
      const otherOrg = await createTestOrganization( {
        name: 'Other Org',
        slug: 'other-org',
      });
      const otherProperty = await prisma.property.create({
        data: {
          organizationId: otherOrg.id,
          name: 'Other Property',
          addressLine1: '456 Oak St',
          city: 'Other City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });

      const response = await request(app)
        .get(`/api/properties/${otherProperty.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/properties/:id', () => {
    let property: any;

    beforeEach(async () => {
      property = await prisma.property.create({
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

    it('should update property', async () => {
      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Property',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Property');
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .put('/api/properties/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Property',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/properties/:id', () => {
    let property: any;

    beforeEach(async () => {
      property = await prisma.property.create({
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

    it('should archive property', async () => {
      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ARCHIVED');
      expect(response.body.data.archivedAt).toBeDefined();
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .delete('/api/properties/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

