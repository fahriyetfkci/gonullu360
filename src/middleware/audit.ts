import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { writeAudit } from '../services/audit';

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMutationLogger(req: AuthRequest, res: Response, next: NextFunction) {
  if (!mutationMethods.has(req.method) || req.originalUrl.startsWith('/api/auth/')) return next();
  res.on('finish', () => {
    if (res.statusCode < 400) {
      void writeAudit(
        req,
        `${req.method} ${req.route?.path || req.path}`,
        req.user?.id,
        req.user?.organizationId,
        { statusCode: res.statusCode, path: req.originalUrl },
      ).catch(error => console.error('Audit kaydı yazılamadı', error));
    }
  });
  next();
}
