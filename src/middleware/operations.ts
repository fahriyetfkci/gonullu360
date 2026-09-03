import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/response';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../db/redis';
import { logger } from '../services/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = String(req.headers['x-request-id'] || crypto.randomUUID());
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => logger.info('request.completed', {
    level: 'info', requestId, method: req.method, path: req.originalUrl,
    status: res.statusCode, durationMs: Date.now() - startedAt,
  }));
  next();
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Endpoint bulunamadı', code: 'NOT_FOUND', path: req.originalUrl });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (error instanceof ZodError) {
    const message = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    sendError(res, 422, message, 'VALIDATION_ERROR');
    return;
  }
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message, error.code);
    return;
  }
  logger.error('request.unhandled_error', {
    method: req.method,
    path: req.originalUrl,
    error: error instanceof Error ? error.message : String(error),
  });
  sendError(res, 500, 'Beklenmeyen sunucu hatası', 'INTERNAL_ERROR');
}

export function createRateLimiter(windowMs: number, maxRequests: number, keyGenerator?: (req: Request) => string, prefix = 'rl:') {
  return rateLimit({
    windowMs,
    limit: maxRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: redis ? new RedisStore({ prefix, sendCommand: ((...args: string[]) => redis!.call(args[0], ...args.slice(1))) as never }) : undefined,
    keyGenerator,
    handler: (_req, res) => res.status(429).json({ error: 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.', code: 'RATE_LIMITED' }),
  });
}

export function writeRequestOnly(middleware: ReturnType<typeof createRateLimiter>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return middleware(req, res, next);
    next();
  };
}
