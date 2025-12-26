import { getRedisClient, isRedisEnabled } from '../../lib/redis.js';

/**
 * Clean up all Redis keys used by the application during tests
 * This should be called before/after each test to ensure test isolation
 */
export const cleanupRedis = async (): Promise<void> => {
  if (!isRedisEnabled()) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    // Clear all rate limit keys (both global and custom patterns)
    const rateLimitKeys = await client.keys('ratelimit:*');
    if (rateLimitKeys.length > 0) {
      await client.del(rateLimitKeys);
    }

    // Clear subscription limit cache keys
    const subscriptionKeys = await client.keys('subscription-limits:*');
    if (subscriptionKeys.length > 0) {
      await client.del(subscriptionKeys);
    }

    // Clear any other test-related keys (add more patterns as needed)
    const testKeys = await client.keys('test:*');
    if (testKeys.length > 0) {
      await client.del(testKeys);
    }
  } catch (error) {
    // Silently fail - Redis cleanup is best effort
    // Tests should still work even if cleanup fails
    console.warn('Redis cleanup failed:', error);
  }
};

