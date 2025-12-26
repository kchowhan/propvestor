import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  rateLimit,
  createRateLimiter,
  strictRateLimit,
  cleanupRateLimitStore,
  getRateLimitStatus,
  resetRateLimit,
  clearAllRateLimits,
  rateLimitStore,
  DEFAULT_RATE_LIMIT,
  WINDOW_SIZE_MS,
} from '../middleware/rate-limit.js';

// Mock the subscriptions module
vi.mock('../lib/subscriptions.js', () => ({
  getSubscriptionLimits: vi.fn().mockResolvedValue({
    properties: 10,
    tenants: 50,
    users: 5,
    storage: 1000,
    apiCalls: 100,
  }),
}));

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Clear rate limit store before each test
    clearAllRateLimits();

    mockRequest = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      auth: undefined,
    };

    mockResponse = {
      setHeader: vi.fn(),
    };

    nextFunction = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimit middleware', () => {
    it('should allow requests within rate limit', async () => {
      await rateLimit(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should track requests per IP for unauthenticated users', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await rateLimit(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }

      expect(nextFunction).toHaveBeenCalledTimes(3);
      
      // Check that the remaining count decreased
      const calls = (mockResponse.setHeader as any).mock.calls;
      const remainingCalls = calls.filter((c: any) => c[0] === 'X-RateLimit-Remaining');
      expect(remainingCalls.length).toBe(3);
    });

    it('should track requests per organization for authenticated users', async () => {
      mockRequest.auth = { userId: 'user-1', organizationId: 'org-1' };

      await rateLimit(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(rateLimitStore.has('org:org-1')).toBe(true);
    });

    it('should block requests when rate limit is exceeded', async () => {
      // Set a very low limit by using a custom limiter
      const customLimiter = createRateLimiter({ max: 2 });
      
      // Make requests up to the limit
      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Reset next function to check if it's called with error
      nextFunction = vi.fn();
      
      // Third request should be blocked
      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 429,
          code: 'LIMIT_EXCEEDED',
        })
      );
    });

    it('should set Retry-After header when rate limit is exceeded', async () => {
      const customLimiter = createRateLimiter({ max: 1 });
      
      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('createRateLimiter', () => {
    it('should create a custom rate limiter with specified options', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 5,
      });

      for (let i = 0; i < 5; i++) {
        await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      expect(nextFunction).toHaveBeenCalledTimes(5);
    });

    it('should use custom key generator', async () => {
      const customLimiter = createRateLimiter({
        max: 10,
        keyGenerator: (req: Request) => `custom:${req.ip}`,
      });

      await customLimiter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should clean up expired entries in custom limiter store', () => {
      const customLimiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
      });

      customLimiter.store.set('custom-key', {
        count: 2,
        windowStart: Date.now() - 2000,
      });

      customLimiter.cleanup();

      expect(customLimiter.store.has('custom-key')).toBe(false);
    });
  });

  describe('strictRateLimit', () => {
    it('should have lower limits than default rate limiter', async () => {
      // strictRateLimit is configured with max: 10 for 15 minutes
      for (let i = 0; i < 10; i++) {
        await strictRateLimit(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      expect(nextFunction).toHaveBeenCalledTimes(10);

      // 11th request should be blocked
      nextFunction = vi.fn();
      await strictRateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 429,
        })
      );
    });
  });

  describe('cleanupRateLimitStore', () => {
    it('should remove expired entries', () => {
      // Add an entry
      rateLimitStore.set('test-key', {
        count: 5,
        windowStart: Date.now() - WINDOW_SIZE_MS - 1000, // Expired
      });

      cleanupRateLimitStore();

      expect(rateLimitStore.has('test-key')).toBe(false);
    });

    it('should keep non-expired entries', () => {
      rateLimitStore.set('fresh-key', {
        count: 5,
        windowStart: Date.now(),
      });

      cleanupRateLimitStore();

      expect(rateLimitStore.has('fresh-key')).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null for unknown keys', () => {
      const status = getRateLimitStatus(mockRequest as Request);
      expect(status).toBeNull();
    });

    it('should return status for known keys', async () => {
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      const status = getRateLimitStatus(mockRequest as Request);
      
      expect(status).not.toBeNull();
      expect(status?.count).toBe(1);
      expect(status?.key).toBe('ip:127.0.0.1');
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for a specific key', async () => {
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(rateLimitStore.has('ip:127.0.0.1')).toBe(true);

      const result = resetRateLimit('ip:127.0.0.1');

      expect(result).toBe(true);
      expect(rateLimitStore.has('ip:127.0.0.1')).toBe(false);
    });

    it('should return false for non-existent keys', () => {
      const result = resetRateLimit('non-existent-key');
      expect(result).toBe(false);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limit entries', async () => {
      // Add some entries
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);
      
      mockRequest.ip = '192.168.1.1';
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(rateLimitStore.size).toBeGreaterThan(0);

      clearAllRateLimits();

      expect(rateLimitStore.size).toBe(0);
    });
  });

  describe('rate limit headers', () => {
    it('should set correct X-RateLimit-Limit header', async () => {
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        DEFAULT_RATE_LIMIT.toString()
      );
    });

    it('should set correct X-RateLimit-Remaining header', async () => {
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        (DEFAULT_RATE_LIMIT - 1).toString()
      );
    });

    it('should set X-RateLimit-Reset header with future timestamp', async () => {
      const beforeTime = Math.ceil(Date.now() / 1000);
      
      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      const setHeaderCalls = (mockResponse.setHeader as any).mock.calls;
      const resetCall = setHeaderCalls.find((c: any) => c[0] === 'X-RateLimit-Reset');
      
      expect(resetCall).toBeDefined();
      const resetTime = parseInt(resetCall[1]);
      expect(resetTime).toBeGreaterThan(beforeTime);
    });
  });

  describe('window expiration', () => {
    it('should reset count after window expires', async () => {
      // Add an entry with an old window
      rateLimitStore.set('ip:127.0.0.1', {
        count: 50,
        windowStart: Date.now() - WINDOW_SIZE_MS - 1000, // Expired window
      });

      await rateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should start a new window with count = 1
      const entry = rateLimitStore.get('ip:127.0.0.1');
      expect(entry?.count).toBe(1);
    });
  });
});
