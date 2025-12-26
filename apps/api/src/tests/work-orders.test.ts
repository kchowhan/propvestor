import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Work Orders Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testProperty: any;
  let testVendor: any;
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

    testVendor = await prisma.vendor.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Vendor',
        phone: '1234567890',
        category: 'PLUMBING',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/work-orders', () => {
    it('should return empty array when no work orders exist', async () => {
      const response = await request(app)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toMatchObject({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return work orders for organization', async () => {
      await prisma.workOrder.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          title: 'Test Work Order',
          description: 'Test description',
          category: 'PLUMBING',
        },
      });

      const response = await request(app)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Test Work Order');
      expect(response.body.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      await prisma.workOrder.createMany({
        data: [
          {
            organizationId: testOrg.id,
            propertyId: testProperty.id,
            title: 'Open Order',
            description: 'Test',
            category: 'PLUMBING',
            status: 'OPEN',
          },
          {
            organizationId: testOrg.id,
            propertyId: testProperty.id,
            title: 'Completed Order',
            description: 'Test',
            category: 'ELECTRICAL',
            status: 'COMPLETED',
          },
        ],
      });

      const response = await request(app)
        .get('/api/work-orders?status=OPEN')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('OPEN');
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('POST /api/work-orders', () => {
    it('should create work order', async () => {
      const response = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          propertyId: testProperty.id,
          title: 'New Work Order',
          description: 'Test description',
          category: 'PLUMBING',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('New Work Order');
      expect(response.body.data.status).toBe('OPEN');
      expect(response.body.data.priority).toBe('NORMAL');
    });

    it('should create work order with vendor assignment', async () => {
      const response = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          propertyId: testProperty.id,
          title: 'New Work Order',
          description: 'Test description',
          category: 'PLUMBING',
          assignedVendorId: testVendor.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.assignedVendorId).toBe(testVendor.id);
    });

    it('should return 404 for invalid property', async () => {
      const response = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          propertyId: '00000000-0000-0000-0000-000000000000',
          title: 'New Work Order',
          description: 'Test description',
          category: 'PLUMBING',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/work-orders/:id', () => {
    let workOrder: any;
    let testUnit: any;

    beforeEach(async () => {
      // Recreate testOrg and testProperty if they don't exist
      // (They should be created in outer beforeEach, but ensure they exist here)
      if (!testOrg) {
        testOrg = await createTestOrganization();
      }
      if (!testProperty) {
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
      }
      
      testUnit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });

      workOrder = await prisma.workOrder.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          unitId: testUnit.id,
          title: 'Test Work Order',
          description: 'Test description',
          category: 'PLUMBING',
        },
      });
    });

    it('should return work order by id', async () => {
      const response = await request(app)
        .get(`/api/work-orders/${workOrder.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(workOrder.id);
    });

    it('should return 404 for non-existent work order', async () => {
      const response = await request(app)
        .get('/api/work-orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/work-orders/:id', () => {
    let workOrder: any;
    let testUnit: any;

    beforeEach(async () => {
      // Recreate testOrg and testProperty if they don't exist
      // (They should be created in outer beforeEach, but ensure they exist here)
      if (!testOrg) {
        testOrg = await createTestOrganization();
      }
      if (!testProperty) {
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
      }
      
      testUnit = await prisma.unit.create({
        data: {
          propertyId: testProperty.id,
          name: 'Unit 1',
        },
      });

      workOrder = await prisma.workOrder.create({
        data: {
          organizationId: testOrg.id,
          propertyId: testProperty.id,
          unitId: testUnit.id,
          title: 'Test Work Order',
          description: 'Test description',
          category: 'PLUMBING',
        },
      });
    });

    it('should update work order', async () => {
      const response = await request(app)
        .put(`/api/work-orders/${workOrder.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Work Order',
          status: 'IN_PROGRESS',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Work Order');
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    it('should update assigned vendor', async () => {
      const response = await request(app)
        .put(`/api/work-orders/${workOrder.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assignedVendorId: testVendor.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.assignedVendorId).toBe(testVendor.id);
    });
  });
});
