import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Units Routes', () => {
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

  describe('GET /api/properties/:propertyId/units', () => {
    it('should return units for property', async () => {
      await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });

      const response = await request(app)
        .get(`/api/properties/${testProperty.id}/units`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Unit 1');
    });

    it('should return 404 for invalid property', async () => {
      const response = await request(app)
        .get('/api/properties/00000000-0000-0000-0000-000000000000/units')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/properties/:propertyId/units', () => {
    it('should create unit', async () => {
      const response = await request(app)
        .post(`/api/properties/${testProperty.id}/units`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Unit 2',
          bedrooms: 2,
          bathrooms: 1.5,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Unit 2');
    });
  });

  describe('GET /api/units/:id', () => {
    let unit: any;

    beforeEach(async () => {
      unit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });
    });

    it('should return unit by id', async () => {
      const response = await request(app)
        .get(`/api/units/${unit.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(unit.id);
    });
  });

  describe('PUT /api/units/:id', () => {
    let unit: any;

    beforeEach(async () => {
      unit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });
    });

    it('should update unit', async () => {
      const response = await request(app)
        .put(`/api/units/${unit.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Unit',
          bedrooms: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Unit');
      expect(response.body.data.bedrooms).toBe(3);
    });
  });

  describe('DELETE /api/units/:id', () => {
    let unit: any;

    beforeEach(async () => {
      unit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });
    });

    it('should archive unit', async () => {
      const response = await request(app)
        .delete(`/api/units/${unit.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.archivedAt).toBeDefined();
    });
  });
});

