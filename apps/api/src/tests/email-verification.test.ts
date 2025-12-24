import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import * as verification from '../lib/verification.js';

describe('Email Verification', () => {
  const app = createApp();

  beforeEach(async () => {
    // Clean up test data (delete in correct order to respect foreign keys)
    await prisma.organizationMembership.deleteMany({
      where: {
        user: {
          email: {
            in: ['test-verification@example.com', 'already-verified@example.com'],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-verification@example.com', 'already-verified@example.com'],
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        name: {
          in: ['Test Verification Org', 'Already Verified Org'],
        },
      },
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create user with email verification token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test-verification@example.com',
          password: 'password123',
          organizationName: 'Test Verification Org',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        name: 'Test User',
        email: 'test-verification@example.com',
        emailVerified: false,
      });
      expect(response.body.organization).toHaveProperty('id');
      expect(response.body).toHaveProperty('message');

      // Verify user was created with verification token
      const user = await prisma.user.findUnique({
        where: { email: 'test-verification@example.com' },
      });

      expect(user).not.toBeNull();
      expect(user?.emailVerified).toBe(false);
      expect(user?.emailVerificationToken).not.toBeNull();
      expect(user?.emailVerificationTokenExpiry).not.toBeNull();
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Create a user with verification token
      const token = verification.generateVerificationToken();
      const expiry = verification.getVerificationTokenExpiry();
      const passwordHash = await bcrypt.hash('password123', 10);

      const org = await prisma.organization.create({
        data: {
          name: 'Test Verification Org',
          slug: 'test-verification-org',
        },
      });

      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-verification@example.com',
          passwordHash,
          emailVerificationToken: token,
          emailVerificationTokenExpiry: expiry,
          memberships: {
            create: {
              organizationId: org.id,
              role: 'OWNER',
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        verified: true,
        message: expect.stringContaining('verified successfully'),
      });

      // Verify user was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.emailVerified).toBe(true);
      expect(updatedUser?.emailVerificationToken).toBeNull();
      expect(updatedUser?.emailVerificationTokenExpiry).toBeNull();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Invalid verification token'),
      });
    });

    it('should reject expired token', async () => {
      const token = verification.generateVerificationToken();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago
      const passwordHash = await bcrypt.hash('password123', 10);

      const org = await prisma.organization.create({
        data: {
          name: 'Test Verification Org',
          slug: 'test-verification-org-expired',
        },
      });

      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-verification@example.com',
          passwordHash,
          emailVerificationToken: token,
          emailVerificationTokenExpiry: expiredDate,
          memberships: {
            create: {
              organizationId: org.id,
              role: 'OWNER',
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('expired'),
      });
    });

    it('should handle already verified email', async () => {
      const token = verification.generateVerificationToken();
      const expiry = verification.getVerificationTokenExpiry();
      const passwordHash = await bcrypt.hash('password123', 10);

      const org = await prisma.organization.create({
        data: {
          name: 'Already Verified Org',
          slug: 'already-verified-org',
        },
      });

      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'already-verified@example.com',
          passwordHash,
          emailVerified: true, // Already verified
          emailVerificationToken: token,
          emailVerificationTokenExpiry: expiry,
          memberships: {
            create: {
              organizationId: org.id,
              role: 'OWNER',
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        verified: true,
        message: expect.stringContaining('already verified'),
      });
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      const org = await prisma.organization.create({
        data: {
          name: 'Test Verification Org',
          slug: 'test-verification-org-resend',
        },
      });

      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-verification@example.com',
          passwordHash,
          emailVerified: false,
          memberships: {
            create: {
              organizationId: org.id,
              role: 'OWNER',
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'test-verification@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('Verification email sent'),
      });

      // Verify token was updated
      const user = await prisma.user.findUnique({
        where: { email: 'test-verification@example.com' },
      });

      expect(user?.emailVerificationToken).not.toBeNull();
      expect(user?.emailVerificationTokenExpiry).not.toBeNull();
    });

    it('should reject resend for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('User not found'),
      });
    });

    it('should reject resend for already verified user', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      const org = await prisma.organization.create({
        data: {
          name: 'Already Verified Org',
          slug: 'already-verified-org-resend',
        },
      });

      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'already-verified@example.com',
          passwordHash,
          emailVerified: true,
          memberships: {
            create: {
              organizationId: org.id,
              role: 'OWNER',
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'already-verified@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('already verified'),
      });
    });
  });

  describe('Verification Utility Functions', () => {
    it('should generate unique verification tokens', () => {
      const token1 = verification.generateVerificationToken();
      const token2 = verification.generateVerificationToken();

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(token2).toHaveLength(64);
    });

    it('should generate expiry 24 hours in the future', () => {
      const now = new Date();
      const expiry = verification.getVerificationTokenExpiry();
      const diff = expiry.getTime() - now.getTime();
      const hours = diff / (1000 * 60 * 60);

      expect(hours).toBeGreaterThanOrEqual(23.9);
      expect(hours).toBeLessThanOrEqual(24.1);
    });
  });
});

