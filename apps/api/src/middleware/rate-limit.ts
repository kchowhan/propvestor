import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { getSubscriptionLimits } from '../lib/subscriptions.js';

// In-memory store for rate limiting (use Redis in production for distributed systems)
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Default limits for unauthenticated requests
const DEFAULT_RATE_LIMIT = 60; // requests per hour
const WINDOW_SIZE_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Plan-based rate limits (requests per hour)
const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 100,
  basic: 1000,
  pro: 10000,
  enterprise: 999999, // Effectively unlimited
};

/**
 * Clean up expired entries from the rate limit store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > WINDOW_SIZE_MS) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Get rate limit for an organization based on their subscription plan
 */
async function getRateLimitForOrganization(organizationId: string): Promise<number> {
  try {
    const limits = await getSubscriptionLimits(organizationId);
    return limits.apiCalls || DEFAULT_RATE_LIMIT;
  } catch {
    return DEFAULT_RATE_LIMIT;
  }
}

/**
 * Generate a rate limit key for the request
 */
function getRateLimitKey(req: Request): string {
  if (req.auth?.organizationId) {
    return `org:${req.auth.organizationId}`;
  }
  // Fall back to IP-based limiting for unauthenticated requests
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 * Limits requests based on organization's subscription plan or IP for unauthenticated requests
 */
export const rateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = getRateLimitKey(req);
  const now = Date.now();

  // Get the appropriate rate limit
  let limit = DEFAULT_RATE_LIMIT;
  if (req.auth?.organizationId) {
    limit = await getRateLimitForOrganization(req.auth.organizationId);
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || now - entry.windowStart > WINDOW_SIZE_MS) {
    // Start a new window
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(key, entry);
  } else {
    entry.count++;
  }

  // Calculate remaining requests and reset time
  const remaining = Math.max(0, limit - entry.count);
  const resetTime = entry.windowStart + WINDOW_SIZE_MS;
  const resetSeconds = Math.ceil((resetTime - now) / 1000);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

  // Check if limit exceeded
  if (entry.count > limit) {
    res.setHeader('Retry-After', resetSeconds.toString());
    return next(
      new AppError(
        429,
        'LIMIT_EXCEEDED',
        `Rate limit exceeded. Please try again in ${resetSeconds} seconds.`
      )
    );
  }

  return next();
};

/**
 * Create a rate limiter with custom settings
 * Useful for specific routes that need different limits
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
}) {
  const {
    windowMs = WINDOW_SIZE_MS,
    max = DEFAULT_RATE_LIMIT,
    keyGenerator = getRateLimitKey,
  } = options;

  const store = new Map<string, RateLimitEntry>();

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 1, windowStart: now };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetTime = entry.windowStart + windowMs;
    const resetSeconds = Math.ceil((resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (entry.count > max) {
      res.setHeader('Retry-After', resetSeconds.toString());
      return next(
        new AppError(
          429,
          'LIMIT_EXCEEDED',
          `Rate limit exceeded. Please try again in ${resetSeconds} seconds.`
        )
      );
    }

    return next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints (login, register, password reset)
 * Much lower limits to prevent brute force attacks
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `strict:${ip}`;
  },
});

/**
 * Admin rate limiter for expensive operations (database queries, reports)
 * Prevents DoS attacks on admin endpoints
 * CodeQL: Addresses "Missing rate limiting" finding
 */
export const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (reasonable for admin operations)
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = req.auth?.userId || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `admin:${userId}:${ip}`;
  },
});

/**
 * Get current rate limit status for a request
 * Useful for debugging or displaying to users
 */
export function getRateLimitStatus(req: Request): {
  key: string;
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
} | null {
  const key = getRateLimitKey(req);
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  const limit = DEFAULT_RATE_LIMIT; // Would need to look up actual limit
  return {
    key,
    count: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: new Date(entry.windowStart + WINDOW_SIZE_MS),
  };
}

/**
 * Reset rate limit for a specific key (useful for testing or admin actions)
 */
export function resetRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// Export the store for testing purposes
export { rateLimitStore, PLAN_RATE_LIMITS, DEFAULT_RATE_LIMIT, WINDOW_SIZE_MS };

