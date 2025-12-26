import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';
import { sendEmail } from '../lib/email.js';

vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(),
}));

const app = createApp();

describe('Homeowner Auth Routes', () => {
  let testOrg: any;
  let testAssociation: any;
  let testProperty: any;
  let testUnit: any;

  beforeEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();

    testOrg = await createTestOrganization();
    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'MULTI_FAMILY',
      },
    });

    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/homeowner-auth/register', () => {
    it('should register homeowner with required fields', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.homeowner.email).toBe('john@example.com');
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Verify homeowner was created
      const homeowner = await prisma.homeowner.findUnique({
        where: {
          associationId_email: {
            associationId: testAssociation.id,
            email: 'john@example.com',
          },
        },
      });
      expect(homeowner).toBeDefined();
      expect(homeowner?.emailVerified).toBe(false);
    });

    it('should register homeowner with unit', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: testAssociation.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          password: 'password123',
          unitId: testUnit.id,
        });

      expect(response.status).toBe(201);
      const homeowner = await prisma.homeowner.findUnique({
        where: {
          associationId_email: {
            associationId: testAssociation.id,
            email: 'jane@example.com',
          },
        },
      });
      expect(homeowner?.unitId).toBe(testUnit.id);
    });

    it('should return 404 for invalid associationId', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: fakeId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(404);
    });

    it('should return 409 for duplicate email', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Existing',
          lastName: 'User',
          email: 'duplicate@example.com',
        },
      });

      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: testAssociation.id,
          firstName: 'New',
          lastName: 'User',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: testAssociation.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/register')
        .send({
          associationId: testAssociation.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login (unified login - homeowner)', () => {
    it('should login homeowner with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123',
          associationId: testAssociation.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.userType).toBe('homeowner');
      expect(response.body.homeowner.id).toBe(homeowner.id);
      expect(response.body.homeowner.email).toBe('john@example.com');
      expect(response.body.association).toBeDefined();
    });

    it('should login without associationId (find by email)', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.userType).toBe('homeowner');
    });

    it('should return 401 for invalid password', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 if password not set', async () => {
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'NoPassword',
          lastName: 'User',
          email: 'nopassword@example.com',
          // No passwordHash
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nopassword@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Password not set');
    });

    it('should return 403 for archived homeowner', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'Archived',
          lastName: 'User',
          email: 'archived@example.com',
          passwordHash,
          archivedAt: new Date(),
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'archived@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('archived');
    });
  });

  describe('GET /api/homeowner-auth/me', () => {
    it('should get current homeowner', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          unitId: testUnit.id,
        },
      });

      const token = jwt.sign(
        { homeownerId: homeowner.id, associationId: testAssociation.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/homeowner-auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.homeowner.id).toBe(homeowner.id);
      expect(response.body.homeowner.firstName).toBe('John');
      expect(response.body.association).toBeDefined();
      expect(response.body.unit).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/homeowner-auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/homeowner-auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/homeowner-auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          emailVerificationToken: 'valid-token',
          emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          emailVerified: false,
        },
      });

      const response = await request(app)
        .post('/api/homeowner-auth/verify-email')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updated = await prisma.homeowner.findUnique({
        where: { id: homeowner.id },
      });
      expect(updated?.emailVerified).toBe(true);
      expect(updated?.emailVerificationToken).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/homeowner-auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const homeowner = await prisma.homeowner.create({
        data: {
          associationId: testAssociation.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          emailVerified: false,
        },
      });

      const response = await request(app)
        .post('/api/homeowner-auth/resend-verification')
        .send({
          email: 'john@example.com',
          associationId: testAssociation.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      const updated = await prisma.homeowner.findUnique({
        where: { id: homeowner.id },
      });
      expect(updated?.emailVerificationToken).toBeDefined();
    });

    it('should return success even if email not found (security)', async () => {
      const response = await request(app)
        .post('/api/homeowner-auth/resend-verification')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

