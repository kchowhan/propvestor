import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { cleanupRedis } from './setup/redis-cleanup.js';

const app = createApp();

describe('Middleware', () => {
  beforeEach(async () => {
    // Clean up Redis keys before each test to prevent rate limiting interference
    await cleanupRedis();
  });

  afterEach(async () => {
    // Clean up Redis keys after each test
    await cleanupRedis();
  });
  describe('requireAuth', () => {
    it('should allow request with valid token', async () => {
      const token = jwt.sign(
        { userId: 'test-user-id', organizationId: 'test-org-id' },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Should not be 401 (even if user doesn't exist, auth middleware passed)
      expect(response.status).not.toBe(401);
    });

    it('should allow request with valid cookie token', async () => {
      const token = jwt.sign(
        { userId: 'test-user-id', organizationId: 'test-org-id' },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `pv_session=${token}`);

      expect(response.status).not.toBe(401);
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with expired token', async () => {
      const token = jwt.sign(
        { userId: 'test-user-id', organizationId: 'test-org-id' },
        env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should reject request without Bearer prefix', async () => {
      const token = jwt.sign(
        { userId: 'test-user-id', organizationId: 'test-org-id' },
        env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token);

      expect(response.status).toBe(401);
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError(404, 'NOT_FOUND', 'Resource not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      expect(error.message).toBe('Generic error');
    });

    it('should format AppError response correctly', async () => {
      // Use valid UUIDs for the test
      const testUserId = '00000000-0000-0000-0000-000000000001';
      const testOrgId = '00000000-0000-0000-0000-000000000002';
      const testPropertyId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${jwt.sign(
          { userId: testUserId, organizationId: testOrgId },
          env.JWT_SECRET
        )}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
