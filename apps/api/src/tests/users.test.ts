import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock email service
vi.mock('../lib/email.js', () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Users Routes', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();

    const passwordHash = await bcrypt.hash('password123', 10);
    testUser = await createTestUser({ passwordHash });
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

  describe('GET /api/users', () => {
    it('should return users for OWNER', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 403 for non-OWNER/ADMIN', async () => {
      const managerUser = await createTestUser( { email: 'manager@test.com' });
      await createTestMembership( managerUser.id, testOrg.id, 'MANAGER');
      const managerToken = jwt.sign(
        { userId: managerUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('should create new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'VIEWER',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.role).toBe('VIEWER');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'invalid-email',
          role: 'VIEWER',
        });

      expect(response.status).toBe(400);
    });

    it('should add existing user to organization if user exists but not in org', async () => {
      const existingUser = await createTestUser({
        email: 'existing@example.com',
        name: 'Existing User',
      });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Existing User',
          email: 'existing@example.com',
          role: 'MANAGER',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('existing@example.com');
      expect(response.body.data.role).toBe('MANAGER');
      expect(response.body.data.message).toContain('Existing user added');
    });

    it('should return 400 if user already exists in organization', async () => {
      const existingUser = await createTestUser({
        email: 'existing@example.com',
      });
      await createTestMembership(existingUser.id, testOrg.id, 'VIEWER');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Existing User',
          email: 'existing@example.com',
          role: 'MANAGER',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already a member');
    });
  });

  describe('POST /api/users/add-existing', () => {
    it('should add existing user to organization', async () => {
      const existingUser = await createTestUser( {
        email: 'existing@example.com',
      });

      const response = await request(app)
        .post('/api/users/add-existing')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'existing@example.com',
          role: 'MANAGER',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('existing@example.com');
      expect(response.body.data.role).toBe('MANAGER');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/add-existing')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'nonexistent@example.com',
          role: 'VIEWER',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/:userId/role', () => {
    let otherUser: any;

    beforeEach(async () => {
      otherUser = await createTestUser( { email: 'other@example.com' });
      await createTestMembership( otherUser.id, testOrg.id, 'VIEWER');
    });

    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/users/${otherUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'MANAGER',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('MANAGER');
    });

    it('should prevent removing last OWNER', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'ADMIN',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/users/:userId', () => {
    let otherUser: any;

    beforeEach(async () => {
      otherUser = await createTestUser( { email: 'other@example.com' });
      await createTestMembership( otherUser.id, testOrg.id, 'VIEWER');
    });

    it('should remove user from organization', async () => {
      const response = await request(app)
        .delete(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should prevent removing last OWNER', async () => {
      // Create a second OWNER so we can test removing the first one
      const secondOwner = await createTestUser({
        email: 'secondowner@example.com',
      });
      await createTestMembership(secondOwner.id, testOrg.id, 'OWNER');
      const secondOwnerToken = jwt.sign(
        { userId: secondOwner.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      // Now try to remove the first OWNER (testUser) - should fail because it's the last one
      // But first remove the second owner
      await request(app)
        .delete(`/api/users/${secondOwner.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Now testUser is the only OWNER, try to remove them using a different user
      const adminUser = await createTestUser({
        email: 'admin@example.com',
      });
      await createTestMembership(adminUser.id, testOrg.id, 'ADMIN');
      const adminToken = jwt.sign(
        { userId: adminUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('last OWNER');
    });

    it('should prevent self-removal', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('cannot remove yourself');
    });

    it('should allow removing non-OWNER user', async () => {
      const nonOwnerUser = await createTestUser({
        email: 'nonowner@example.com',
      });
      await createTestMembership(nonOwnerUser.id, testOrg.id, 'VIEWER');

      const response = await request(app)
        .delete(`/api/users/${nonOwnerUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should allow removing OWNER if there are multiple OWNERs', async () => {
      const secondOwner = await createTestUser({
        email: 'secondowner@example.com',
      });
      await createTestMembership(secondOwner.id, testOrg.id, 'OWNER');

      const response = await request(app)
        .delete(`/api/users/${secondOwner.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/users/:userId/role edge cases', () => {
    let otherUser: any;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
      });
      await createTestMembership(otherUser.id, testOrg.id, 'VIEWER');
    });

    it('should allow changing role to OWNER', async () => {
      const response = await request(app)
        .put(`/api/users/${otherUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'OWNER',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('OWNER');
    });

    it('should prevent removing last OWNER when changing role', async () => {
      // testUser is the only OWNER
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'ADMIN',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('last OWNER');
    });
  });
});

