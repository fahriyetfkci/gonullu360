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
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

