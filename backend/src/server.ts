import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => console.info(`Forms API listening on port ${env.PORT}`));

  const shutdown = (signal: string): void => {
    console.info(`${signal} received, shutting down`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error: unknown) => {
  console.error("Forms API could not start", error);
  process.exit(1);
});
