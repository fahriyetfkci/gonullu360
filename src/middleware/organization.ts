import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { config } from '../config';
import { AuthRequest } from './auth';

export interface OrganizationRequest extends AuthRequest {
  organizationId?: string;
}

let demoOrganizationId: string | undefined;

export async function organizationContext(req: OrganizationRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as NonNullable<AuthRequest['user']>;
      req.user = decoded;
      req.organizationId = decoded.organizationId;
      return next();
    }
    if (config.appMode === 'production') return res.status(401).json({ error: 'Organizasyon erişimi için oturum gereklidir' });
    if (!demoOrganizationId) {
      const organization = await prisma.organization.findUnique({ where: { slug: 'gonullu360' }, select: { id: true } });
      if (!organization) return res.status(503).json({ error: 'Demo organizasyonu bulunamadı' });
      demoOrganizationId = organization.id;
    }
    req.organizationId = demoOrganizationId;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}
