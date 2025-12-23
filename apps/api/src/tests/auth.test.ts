import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Auth Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testMembership: any;

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and create organization', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          organizationName: 'Test Org',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.organization.name).toBe('Test Org');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
          organizationName: 'Test Org',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'short',
          organizationName: 'Test Org',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should not allow duplicate emails', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'duplicate@example.com',
          password: 'password123',
          organizationName: 'Test Org',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = await createTestUser({
        email: 'login@example.com',
        passwordHash,
      });
      testOrg = await createTestOrganization();
      testMembership = await createTestMembership(
        testUser.id,
        testOrg.id
      );
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.organizations).toBeDefined();
      expect(response.body.organizations.length).toBeGreaterThan(0);
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for user without organization', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const userWithoutOrg = await createTestUser({
        email: 'noorg@example.com',
        passwordHash,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noorg@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = await createTestUser({ passwordHash });
      testOrg = await createTestOrganization();
      testMembership = await createTestMembership(
        testUser.id,
        testOrg.id,
        'ADMIN'
      );
    });

    it('should return user info with valid token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.organization.id).toBe(testOrg.id);
      expect(response.body.currentRole).toBe('ADMIN');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/organizations', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = await createTestUser( { passwordHash });
      testOrg = await createTestOrganization();
      testMembership = await createTestMembership(
        testUser.id,
        testOrg.id
      );
    });

    it('should return user organizations', async () => {
      const token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/organizations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/switch-organization', () => {
    let secondOrg: any;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      testUser = await createTestUser({ passwordHash });
      testOrg = await createTestOrganization();
      secondOrg = await createTestOrganization({
        name: 'Second Org',
        slug: 'second-org',
      });
      await createTestMembership(testUser.id, testOrg.id);
      await createTestMembership(testUser.id, secondOrg.id, 'MANAGER');
    });

    it('should switch to valid organization', async () => {
      const token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: secondOrg.id });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.organization.id).toBe(secondOrg.id);
    });

    it('should return 403 for organization user does not belong to', async () => {
      const otherOrg = await createTestOrganization( {
        name: 'Other Org',
        slug: 'other-org',
      });
      const token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .post('/api/auth/switch-organization')
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: otherOrg.id });

      expect(response.status).toBe(403);
    });
  });
});

