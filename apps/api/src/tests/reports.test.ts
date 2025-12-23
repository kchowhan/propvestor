import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Reports Routes', () => {
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

  describe('GET /api/reports/rent-roll', () => {
    it('should return rent roll data', async () => {
      const response = await request(app)
        .get('/api/reports/rent-roll?month=1&year=2024')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/delinquency', () => {
    it('should return delinquency data', async () => {
      const response = await request(app)
        .get('/api/reports/delinquency')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/kpis', () => {
    it('should return KPI data', async () => {
      const response = await request(app)
        .get('/api/reports/kpis')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalProperties).toBeDefined();
      expect(response.body.data.totalUnits).toBeDefined();
      expect(response.body.data.occupancyRate).toBeDefined();
    });

    it('should handle zero units for occupancy rate', async () => {
      const response = await request(app)
        .get('/api/reports/kpis')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.occupancyRate).toBe(0);
    });

    it('should calculate occupancy rate correctly', async () => {
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

      await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
          status: 'OCCUPIED',
        },
      });

      await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 2',
          status: 'VACANT',
        },
      });

      const response = await request(app)
        .get('/api/reports/kpis')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalUnits).toBe(2);
      expect(response.body.data.occupancyRate).toBe(0.5);
    });
  });

  describe('GET /api/reports/rent-roll with data', () => {
    let testProperty: any;
    let testUnit: any;
    let testTenant: any;
    let testLease: any;
    let testCharge: any;

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

      testCharge = await prisma.charge.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          leaseId: testLease.id,
          type: 'RENT',
          description: 'Monthly rent',
          amount: 1000,
          dueDate: new Date('2024-01-15'),
        },
      });
    });

    it('should return rent roll with charges and payments', async () => {
      await prisma.payment.create({
        data: {
          organizationId: testOrg.id,
          chargeId: testCharge.id,
          amount: 500,
          receivedDate: new Date('2024-01-10'),
          method: 'ONLINE_PROCESSOR',
        },
      });

      const response = await request(app)
        .get('/api/reports/rent-roll?month=1&year=2024')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const row = response.body.data.find((r: any) => r.chargeId === testCharge.id);
      expect(row).toBeDefined();
      expect(row.rentAmount).toBe(1000);
      expect(row.amountPaid).toBe(500);
      expect(row.balance).toBe(500);
    });

    it('should handle charges without payments', async () => {
      const response = await request(app)
        .get('/api/reports/rent-roll?month=1&year=2024')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const row = response.body.data.find((r: any) => r.chargeId === testCharge.id);
      expect(row.amountPaid).toBe(0);
      expect(row.balance).toBe(1000);
    });
  });
});

