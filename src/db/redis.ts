import Redis from 'ioredis';
import { config } from '../config';

export const redis = config.redisUrl
  ? new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
  : null;

export async function connectRedis() {
  if (redis && redis.status === 'wait') await redis.connect();
}

export async function disconnectRedis() {
  if (redis && redis.status !== 'end') await redis.quit();
}
