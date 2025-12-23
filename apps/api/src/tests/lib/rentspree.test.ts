import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScreeningApplication, getApplicationStatus } from '../../lib/rentspree.js';
import crypto from 'crypto';

// Mock env config
vi.mock('../../config/env.js', () => ({
  env: {
    RENTSPREE_API_KEY: 'test-api-key',
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('RentSpree Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createScreeningApplication', () => {
    it('should create screening application', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          applicationId: 'ext-123',
          applicationUrl: 'https://rentspree.com/app/123',
          status: 'PENDING',
        }),
      });

      const result = await createScreeningApplication({
        applicantFirstName: 'John',
        applicantLastName: 'Doe',
        applicantEmail: 'john@example.com',
        applicantPhone: '1234567890',
      });

      expect(result.applicationId).toBe('ext-123');
      expect(result.applicationUrl).toBeDefined();
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid request' }),
      });

      await expect(
        createScreeningApplication({
          applicantFirstName: 'John',
          applicantLastName: 'Doe',
          applicantEmail: 'invalid-email',
        })
      ).rejects.toThrow();
    });
  });

  describe('getApplicationStatus', () => {
    it('should get application status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          creditScore: 750,
          flags: [],
        }),
      });

      const result = await getApplicationStatus('ext-123');

      expect(result).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.creditScore).toBe(750);
    });

    it('should handle API errors with JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid request', error: 'Validation failed' }),
      });

      await expect(
        getApplicationStatus('ext-123')
      ).rejects.toThrow();
    });

    it('should handle API errors without JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        getApplicationStatus('ext-123')
      ).rejects.toThrow();
    });

    it('should throw error when API key is not configured', async () => {
      // Mock env to not have API key
      vi.doMock('../../config/env.js', () => ({
        env: {
          RENTSPREE_API_KEY: '',
        },
      }));

      // Re-import to get new mock
      const { createScreeningApplication: createApp } = await import('../../lib/rentspree.js');

      await expect(
        createApp({
          applicantFirstName: 'John',
          applicantLastName: 'Doe',
          applicantEmail: 'john@example.com',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature', async () => {
      const { verifyWebhookSignature } = await import('../../lib/rentspree.js');
      
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const { verifyWebhookSignature } = await import('../../lib/rentspree.js');
      
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';

      const isValid = verifyWebhookSignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });
});

