import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err: Error) => logger.error("Redis error", { error: err.message }));
redis.on("close", () => logger.warn("Redis connection closed"));

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') return;
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
    return;
  }
  // Rate-limit stores can start the lazy connection while modules are loaded.
  await new Promise<void>((resolve, reject) => {
    const ready = (): void => { cleanup(); resolve(); };
    const failed = (error: Error): void => { cleanup(); reject(error); };
    const cleanup = (): void => { redis.off('ready', ready); redis.off('error', failed); };
    redis.once('ready', ready);
    redis.once('error', failed);
  });
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
