import { Prisma } from '@prisma/client';
import { Request } from 'express';
import prisma from '../db/prisma';
import { logger } from './logger';

export async function writeAudit(req: Request, action: string, userId?: string | null, organizationId?: string | null, metadata?: Prisma.InputJsonValue) {
  try { await prisma.auditLog.create({
    data: {
      action,
      userId: userId ?? null,
      organizationId: organizationId ?? null,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || null,
      metadata,
    },
  }); } catch (error) {
    logger.error('audit.write_failed', { action, error: error instanceof Error ? error.message : String(error) });
  }
}
