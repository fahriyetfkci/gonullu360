import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CSRF_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().transform((value) => value === "true").default("false"),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:3000,http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),
  EMAIL_VERIFY_TOKEN_TTL: z.coerce.number().int().positive().default(86400),
  RESET_PASSWORD_TOKEN_TTL: z.coerce.number().int().positive().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(`Invalid environment variables:\n${JSON.stringify(parsed.error.format(), null, 2)}\n`);
  process.exit(1);
}

export const env = parsed.data;
