import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (!env.REDIS_URL) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!connectPromise) {
    client = createClient({ url: env.REDIS_URL });
    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    connectPromise = client.connect().then(() => client as RedisClientType);
  }

  return connectPromise;
};

export const isRedisEnabled = (): boolean => Boolean(env.REDIS_URL);
