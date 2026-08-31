import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../database/redis";
import { env } from "../config/env";
import { Request, Response } from "express";

function buildRedisStore(prefix: string): RedisStore {
  return new RedisStore({
    // @ts-expect-error — rate-limit-redis sendCommand types differ slightly
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix,
  });
}

function rateLimitStore(prefix: string): RedisStore | undefined {
  return env.NODE_ENV === "test" ? undefined : buildRedisStore(prefix);
}

function tooManyRequestsHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Çok fazla istek gönderildi. Lütfen bekleyin." },
  });
}

// IP-based rate limit for login endpoint
export const loginIpRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore("rl:login:ip:"),
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: tooManyRequestsHandler,
});

// Tenant + email based rate limit for login (stricter)
export const loginTenantRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore("rl:login:tenant:"),
  keyGenerator: (req) => {
    const { organizationSlug, email } = req.body as { organizationSlug?: string; email?: string };
    const normalizedOrgSlug = organizationSlug?.trim().toLowerCase() ?? "";
    const normalizedEmail = email?.trim().toLowerCase() ?? "";
    return `${normalizedOrgSlug}:${normalizedEmail}`;
  },
  handler: tooManyRequestsHandler,
  skip: (req) => !req.body?.organizationSlug || !req.body?.email,
});

// General API rate limit
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore("rl:global:"),
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: tooManyRequestsHandler,
});

// Loose limit for password reset and verification endpoints
export const sensitiveEndpointRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore("rl:sensitive:"),
  keyGenerator: (req) => {
    const { email } = req.body as { email?: string };
    return `${req.ip ?? "unknown"}:${email ?? ""}`;
  },
  handler: tooManyRequestsHandler,
});
