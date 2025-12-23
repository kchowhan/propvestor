import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Payments Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testCharge: any;
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

    testCharge = await prisma.charge.create({
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

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/payments', () => {
    it('should return empty array when no payments exist', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return payments for organization', async () => {
      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: new Date(),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].method).toBe('ONLINE_PROCESSOR');
    });
  });

  describe('POST /api/payments', () => {
    it('should create payment', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: testCharge.id,
          amount: 1000,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.method).toBe('ONLINE_PROCESSOR');
    });

    it('should return 404 for invalid charge', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chargeId: '00000000-0000-0000-0000-000000000000',
          amount: 1000,
          receivedDate: '2024-01-01',
          method: 'ONLINE_PROCESSOR',
        });

      expect(response.status).toBe(404);
    });
  });
});

