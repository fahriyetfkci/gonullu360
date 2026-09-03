import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import dashboardRoutes from './routes/dashboard';
import volunteerRoutes from './routes/volunteers';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import applicationRoutes from './routes/applications';
import formRoutes from './routes/forms';
import { config } from './config';
import prisma from './db/prisma';
import { hashPassword } from './security/password';
import { requestLogger, notFoundHandler, errorHandler, createRateLimiter, writeRequestOnly } from './middleware/operations';
import { openApiDocument } from './openapi';
import { auditMutationLogger } from './middleware/audit';
import { connectRedis, disconnectRedis } from './db/redis';
import { logger } from './services/logger';

const app = express();
const PORT = config.port;
app.set('trust proxy', 1);

// Eski düz metin şifreleri uygulama ilk açıldığında güvenli hash'e dönüştürür.
async function prepareDatabase() {
  await connectRedis();
  await prisma.$connect();
  const users = await prisma.user.findMany({ select: { id:true, password:true } });
  for (const user of users) {
    if (!user.password.startsWith('$2') && !user.password.startsWith('$argon2')) await prisma.user.update({ where:{ id:user.id }, data:{ password:await hashPassword(user.password) } });
  }
}

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.frontendOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS tarafından izin verilmeyen adres'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser(config.cookieSecret));
app.use(requestLogger);
app.use('/api', createRateLimiter(config.rateLimitWindowMs, config.rateLimitMax));
app.use('/api', writeRequestOnly(createRateLimiter(config.rateLimitWindowMs, config.writeRateLimitMax)));
app.use(auditMutationLogger);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'postgresql', mode: config.appMode, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/forms', formRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  prepareDatabase()
    .then(() => {
      const server = app.listen(PORT, (listenError?: Error) => {
        if (listenError) {
          logger.error('server.listen_failed', { port: PORT, error: listenError.message });
          process.exitCode = 1;
          return;
        }
        logger.info('server.started', { port: PORT, database: 'postgresql' });
      });
      const shutdown = (signal: 'SIGTERM' | 'SIGINT') => {
        logger.info('server.stopping', { signal });
        server.close(() => { void Promise.all([prisma.$disconnect(), disconnectRedis()]).finally(() => process.exit(0)); });
      };
      process.once('SIGTERM', () => shutdown('SIGTERM'));
      process.once('SIGINT', () => shutdown('SIGINT'));
    })
    .catch(error => { logger.error('server.start_failed', { error: error instanceof Error ? error.message : String(error) }); process.exit(1); });
}

export default app;
