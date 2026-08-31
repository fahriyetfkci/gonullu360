import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:3000,http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(`Invalid environment variables:\n${JSON.stringify(parsed.error.format(), null, 2)}\n`);
  process.exit(1);
}

export const env = parsed.data;
