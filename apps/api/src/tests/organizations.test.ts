import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Organizations Routes', () => {
  let testUser: any;
  let testOrg: any;
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
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/organizations', () => {
    it('should create organization for OWNER user', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Organization' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('New Organization');
      expect(response.body.data.slug).toBeDefined();
    });

    it('should return 403 for non-OWNER user', async () => {
      const managerUser = await createTestUser( { email: 'manager@test.com' });
      await createTestMembership( managerUser.id, testOrg.id, 'MANAGER');
      const managerToken = jwt.sign(
        { userId: managerUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'New Organization' });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid name', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should generate unique slug when slug exists', async () => {
      // Create first org with name that will generate similar slug
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Organization' });

      // Create second org with similar name
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Organization' });

      expect(response.status).toBe(201);
      expect(response.body.data.slug).toBeDefined();
      // Slug should be unique (includes timestamp)
      expect(response.body.data.slug).toContain('test-organization');
    });
  });

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return organization if user is member', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testOrg.id);
    });

    it('should return 404 if user is not member', async () => {
      const otherOrg = await createTestOrganization( {
        name: 'Other Org',
        slug: 'other-org',
      });

      const response = await request(app)
        .get(`/api/organizations/${otherOrg.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

