import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Charges Routes', () => {
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

  describe('GET /api/charges', () => {
    it('should return empty array when no charges exist', async () => {
      const response = await request(app)
        .get('/api/charges')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return charges for organization', async () => {
      await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/charges')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].type).toBe('RENT');
    });
  });

  describe('POST /api/charges', () => {
    it('should create charge', async () => {
      const response = await request(app)
        .post('/api/charges')
        .set('Authorization', `Bearer ${token}`)
        .send({
          propertyId: testProperty.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: '2024-01-01',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('RENT');
      expect(response.body.data.status).toBe('PENDING');
    });
  });

  describe('GET /api/charges/:id', () => {
    let charge: any;

    beforeEach(async () => {
      charge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });
    });

    it('should return charge by id', async () => {
      const response = await request(app)
        .get(`/api/charges/${charge.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(charge.id);
    });

    it('should return 404 for non-existent charge', async () => {
      const response = await request(app)
        .get('/api/charges/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/charges/:id', () => {
    let charge: any;

    beforeEach(async () => {
      charge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date(),
        },
      });
    });

    it('should update charge', async () => {
      const response = await request(app)
        .put(`/api/charges/${charge.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 1200,
          status: 'PAID',
        });

      expect(response.status).toBe(200);
      expect(Number(response.body.data.amount)).toBe(1200);
      expect(response.body.data.status).toBe('PAID');
    });
  });
});

