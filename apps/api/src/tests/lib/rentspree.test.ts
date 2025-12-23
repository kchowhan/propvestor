import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScreeningApplication, getApplicationStatus } from '../../lib/rentspree.js';

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
  });
});

