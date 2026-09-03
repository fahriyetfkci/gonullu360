import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL zorunludur'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalıdır'),
  JWT_EXPIRES_IN: z.string().min(1).default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('30d'),
  COOKIE_SECRET: z.string().min(32).default('development-cookie-secret-change-me-now'),
  CSRF_SECRET: z.string().min(32).default('development-csrf-secret-change-me-now'),
  REDIS_URL: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),
  APP_MODE: z.enum(['demo', 'production']).default('demo'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  WRITE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SEED_USER_PASSWORD: z.string().min(10).optional(),
  UPLOAD_DIR: z.string().min(1).default('storage/form-uploads'),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),
  EMAIL_VERIFY_TOKEN_TTL: z.coerce.number().int().positive().default(86400),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Ortam değişkenleri geçersiz: ${details}`);
}

const env = parsed.data;
if (env.NODE_ENV === 'production') {
  const missing: string[] = [];
  if (!process.env.COOKIE_SECRET || env.COOKIE_SECRET.includes('change-me')) missing.push('COOKIE_SECRET');
  if (!process.env.CSRF_SECRET || env.CSRF_SECRET.includes('change-me')) missing.push('CSRF_SECRET');
  if (!env.REDIS_URL) missing.push('REDIS_URL');
  if (!env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!env.SMTP_USER) missing.push('SMTP_USER');
  if (!env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  if (!env.SMTP_FROM) missing.push('SMTP_FROM');
  if (env.APP_MODE !== 'production') missing.push('APP_MODE=production');
  if (missing.length) throw new Error(`Üretim ortamı yapılandırması eksik: ${missing.join(', ')}`);
}
const frontendOrigins = (env.CORS_ORIGINS || env.FRONTEND_ORIGIN)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  cookieSecret: env.COOKIE_SECRET,
  csrfSecret: env.CSRF_SECRET,
  redisUrl: env.REDIS_URL,
  frontendOrigin: env.FRONTEND_ORIGIN,
  frontendOrigins,
  appMode: env.APP_MODE,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  writeRateLimitMax: env.WRITE_RATE_LIMIT_MAX,
  seedUserPassword: env.SEED_USER_PASSWORD,
  uploadDir: env.UPLOAD_DIR,
  argon2: { memoryCost: env.ARGON2_MEMORY_COST, timeCost: env.ARGON2_TIME_COST, parallelism: env.ARGON2_PARALLELISM },
  emailVerifyTokenTtl: env.EMAIL_VERIFY_TOKEN_TTL,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.SMTP_FROM,
  },
};
