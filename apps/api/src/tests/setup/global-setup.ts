import { cleanupRedis } from './redis-cleanup.js';

/**
 * Global setup that runs once before all tests
 * Cleans up any leftover Redis keys from previous test runs
 */
export default async function globalSetup() {
  // Clean up Redis before starting tests
  await cleanupRedis();
}

