import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Vendors Routes', () => {
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

  describe('GET /api/vendors', () => {
    it('should return empty array when no vendors exist', async () => {
      const response = await request(app)
        .get('/api/vendors')
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

    it('should return vendors for organization', async () => {
      await prisma.vendor.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Vendor',
          phone: '1234567890',
          category: 'PLUMBING',
        },
      });

      const response = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Test Vendor');
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('POST /api/vendors', () => {
    it('should create vendor with required fields', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Vendor',
          phone: '1234567890',
          category: 'ELECTRICAL',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('New Vendor');
      expect(response.body.data.phone).toBe('1234567890');
    });

    it('should create vendor with optional fields', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Vendor',
          phone: '1234567890',
          email: 'vendor@example.com',
          website: 'https://vendor.com',
          category: 'HVAC',
          notes: 'Test notes',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('vendor@example.com');
      expect(response.body.data.website).toBe('https://vendor.com');
    });

    it('should return 400 for missing phone', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Vendor',
          category: 'PLUMBING',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for short phone', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Vendor',
          phone: '123',
          category: 'PLUMBING',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/vendors/:id', () => {
    let vendor: any;

    beforeEach(async () => {
      vendor = await prisma.vendor.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Vendor',
          phone: '1234567890',
          category: 'PLUMBING',
        },
      });
    });

    it('should return vendor by id', async () => {
      const response = await request(app)
        .get(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(vendor.id);
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .get('/api/vendors/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/vendors/:id', () => {
    let vendor: any;

    beforeEach(async () => {
      vendor = await prisma.vendor.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Vendor',
          phone: '1234567890',
          category: 'PLUMBING',
        },
      });
    });

    it('should update vendor', async () => {
      const response = await request(app)
        .put(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Vendor',
          category: 'ELECTRICAL',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Vendor');
      expect(response.body.data.category).toBe('ELECTRICAL');
    });

    it('should update website', async () => {
      const response = await request(app)
        .put(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          website: 'https://updated.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.website).toBe('https://updated.com');
    });

    it('should clear website when empty string', async () => {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { website: 'https://example.com' },
      });

      const response = await request(app)
        .put(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          website: '',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.website).toBeNull();
    });
  });

  describe('DELETE /api/vendors/:id', () => {
    let vendor: any;

    beforeEach(async () => {
      vendor = await prisma.vendor.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Vendor',
          phone: '1234567890',
          category: 'PLUMBING',
        },
      });
    });

    it('should delete vendor', async () => {
      const response = await request(app)
        .delete(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(vendor.id);

      // Verify deleted
      const getResponse = await request(app)
        .get(`/api/vendors/${vendor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
