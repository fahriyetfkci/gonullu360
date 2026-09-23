import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";
import { connectRedis, disconnectRedis } from "./database/redis";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  await connectRedis();
  await prisma.$connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`Gonullu360 API listening on port ${env.PORT}`));

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void Promise.all([prisma.$disconnect(), disconnectRedis()]).finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error: unknown) => {
  logger.error("Gonullu360 API could not start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
