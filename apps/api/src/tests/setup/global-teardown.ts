import { closeRedisClient } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Global teardown that runs once after all tests
 * Closes database and Redis connections to allow the process to exit
 */
export default async function globalTeardown() {
  // Close Redis connection
  await closeRedisClient();
  
  // Close Prisma connection
  await prisma.$disconnect();
}

