/**
 * Clean up all Redis keys used by the application during tests
 * This should be called before/after each test to ensure test isolation
 * Handles cases where Redis is not configured (e.g., tests that don't need it)
 */
export const cleanupRedis = async (): Promise<void> => {
  // Check if Redis is configured before importing (to avoid env validation errors)
  if (!process.env.REDIS_URL) {
    return;
  }

  try {
    // Dynamic import to avoid loading redis.ts (and env.ts) when not needed
    const { getRedisClient, isRedisEnabled } = await import('../../lib/redis.js');
    
    if (!isRedisEnabled()) {
      return;
    }

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
  } catch (error: any) {
    // Silently fail - Redis cleanup is best effort
    // Tests should still work even if cleanup fails
    // Don't log errors if it's just missing env vars (expected in some tests)
    if (error?.message?.includes('Required') || error?.issues) {
      // This is an env validation error - expected when env vars aren't set
      return;
    }
    console.warn('Redis cleanup failed:', error);
  }
};

