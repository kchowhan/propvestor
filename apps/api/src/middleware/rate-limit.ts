import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { getSubscriptionLimits } from '../lib/subscriptions.js';
import { getRedisClient, isRedisEnabled } from '../lib/redis.js';

// In-memory store for rate limiting (use Redis in production for distributed systems)
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

type SubscriptionLimitCacheEntry = {
  apiCalls: number;
  expiresAt: number;
};

// In-memory cache fallback (only used when Redis is not available)
// In production with Redis, this should not be used to ensure statelessness across instances
const subscriptionLimitCache = new Map<string, SubscriptionLimitCacheEntry>();
const SUBSCRIPTION_LIMIT_CACHE_TTL_MS = 60 * 1000;
const SUBSCRIPTION_LIMIT_CACHE_TTL_SEC = Math.floor(SUBSCRIPTION_LIMIT_CACHE_TTL_MS / 1000);

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
function cleanupStore(store: Map<string, RateLimitEntry>, windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > windowMs) {
      store.delete(key);
    }
  }
}

export async function cleanupRateLimitStore(): Promise<void> {
  if (!isRedisEnabled()) {
    cleanupStore(rateLimitStore, WINDOW_SIZE_MS);
  }
  await cleanupSubscriptionLimitCache();
}

// Run cleanup every 5 minutes
// Note: Redis keys expire automatically, so cleanup is mainly for in-memory fallback
setInterval(() => {
  cleanupRateLimitStore().catch((err) => {
    console.error('Error during rate limit cleanup:', err);
  });
}, 5 * 60 * 1000);

/**
 * Get rate limit for an organization based on their subscription plan
 * Uses Redis cache when available for multi-instance support
 */
async function getRateLimitForOrganization(organizationId: string): Promise<number> {
  try {
    // Try Redis first (for multi-instance support)
    if (isRedisEnabled()) {
      const client = await getRedisClient();
      if (client) {
        const cacheKey = `subscription-limits:org:${organizationId}`;
        const cached = await client.get(cacheKey);
        if (cached) {
          const apiCalls = parseInt(cached, 10);
          if (!isNaN(apiCalls)) {
            return apiCalls;
          }
        }
      }
    }

    // Fallback to in-memory cache (only when Redis is not available)
    const cached = subscriptionLimitCache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.apiCalls || DEFAULT_RATE_LIMIT;
    }
    if (cached) {
      subscriptionLimitCache.delete(organizationId);
    }

    // Fetch from database
    const limits = await getSubscriptionLimits(organizationId);
    const apiCalls = limits.apiCalls || DEFAULT_RATE_LIMIT;

    // Store in Redis if available
    if (isRedisEnabled()) {
      const client = await getRedisClient();
      if (client) {
        const cacheKey = `subscription-limits:org:${organizationId}`;
        await client.setEx(cacheKey, SUBSCRIPTION_LIMIT_CACHE_TTL_SEC, apiCalls.toString());
      }
    } else {
      // Fallback to in-memory cache
      subscriptionLimitCache.set(organizationId, {
        apiCalls,
        expiresAt: Date.now() + SUBSCRIPTION_LIMIT_CACHE_TTL_MS,
      });
    }

    return apiCalls;
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
  const redisKey = `ratelimit:global:${key}`;

  // Get the appropriate rate limit
  let limit = DEFAULT_RATE_LIMIT;
  if (req.auth?.organizationId) {
    limit = await getRateLimitForOrganization(req.auth.organizationId);
  }

  const result =
    (await incrementInRedis(redisKey, WINDOW_SIZE_MS)) ||
    incrementInMemory(rateLimitStore, key, WINDOW_SIZE_MS);

  // Calculate remaining requests and reset time
  const remaining = Math.max(0, limit - result.count);
  const resetSeconds = Math.ceil((result.resetTimeMs - now) / 1000);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

  // Check if limit exceeded
  if (result.count > limit) {
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
export type RateLimiter = ((
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>) & {
  cleanup: () => void;
  store: Map<string, RateLimitEntry>;
  windowMs: number;
};

type IncrementResult = {
  count: number;
  resetTimeMs: number;
};

function incrementInMemory(
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number
): IncrementResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  return { count: entry.count, resetTimeMs: entry.windowStart + windowMs };
}

async function incrementInRedis(
  key: string,
  windowMs: number
): Promise<IncrementResult | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const windowSeconds = Math.ceil(windowMs / 1000);
    const count = await client.incr(key);
    let ttl = await client.ttl(key);

    if (ttl < 0) {
      await client.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    return { count, resetTimeMs: Date.now() + ttl * 1000 };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return null;
  }
}

export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  prefix?: string;
}): RateLimiter {
  const {
    windowMs = WINDOW_SIZE_MS,
    max = DEFAULT_RATE_LIMIT,
    keyGenerator = getRateLimitKey,
    prefix = 'custom',
  } = options;

  const store = new Map<string, RateLimitEntry>();
  if (!isRedisEnabled()) {
    const cleanupIntervalMs = Math.min(5 * 60 * 1000, windowMs);
    const cleanupTimer = setInterval(() => cleanupStore(store, windowMs), cleanupIntervalMs);
    if (typeof cleanupTimer.unref === 'function') {
      cleanupTimer.unref();
    }
  }

  const middleware = async (req: Request, res: Response, next: NextFunction) => {
    const key = `${prefix}:${keyGenerator(req)}`;
    const now = Date.now();
    const redisKey = `ratelimit:${key}`;
    const result =
      (await incrementInRedis(redisKey, windowMs)) || incrementInMemory(store, key, windowMs);
    const remaining = Math.max(0, max - result.count);
    const resetSeconds = Math.ceil((result.resetTimeMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

    if (result.count > max) {
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

  return Object.assign(middleware, {
    cleanup: () => {
      if (!isRedisEnabled()) {
        cleanupStore(store, windowMs);
      }
    },
    store,
    windowMs,
  });
}

/**
 * Strict rate limiter for sensitive endpoints (login, register, password reset)
 * Much lower limits to prevent brute force attacks
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  prefix: 'strict',
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
  prefix: 'admin',
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = req.auth?.userId || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `admin:${userId}:${ip}`;
  },
});

/**
 * Webhook rate limiter for external service callbacks
 * Prevents DoS attacks on webhook endpoints even with signature verification
 * CodeQL: Ensures webhooks are rate-limited to prevent abuse
 * 
 * Limits:
 * - 100 requests per minute per IP (protects against flooding)
 * - Signature verification provides authentication, rate limiting provides DoS protection
 */
export const webhookRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP (generous for legitimate webhooks)
  prefix: 'webhook',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // Use the webhook path in the key to track per-webhook-endpoint
    const path = req.path || 'unknown';
    return `webhook:${path}:${ip}`;
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
  if (isRedisEnabled()) {
    return null;
  }

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
  if (isRedisEnabled()) {
    return false;
  }
  return rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export async function clearAllRateLimits(): Promise<void> {
  if (!isRedisEnabled()) {
    rateLimitStore.clear();
  }
  await clearSubscriptionLimitCache();
}

async function cleanupSubscriptionLimitCache(): Promise<void> {
  // Redis keys expire automatically, so only clean in-memory cache
  if (!isRedisEnabled()) {
    const now = Date.now();
    for (const [key, entry] of subscriptionLimitCache.entries()) {
      if (entry.expiresAt <= now) {
        subscriptionLimitCache.delete(key);
      }
    }
  }
}

export async function clearSubscriptionLimitCache(): Promise<void> {
  if (isRedisEnabled()) {
    // Clear Redis cache
    const client = await getRedisClient();
    if (client) {
      const keys = await client.keys('subscription-limits:*');
      if (keys.length > 0) {
        await client.del(keys);
      }
    }
  } else {
    // Clear in-memory cache
    subscriptionLimitCache.clear();
  }
}

// Export the store for testing purposes
export {
  rateLimitStore,
  PLAN_RATE_LIMITS,
  DEFAULT_RATE_LIMIT,
  WINDOW_SIZE_MS,
  SUBSCRIPTION_LIMIT_CACHE_TTL_MS,
};
