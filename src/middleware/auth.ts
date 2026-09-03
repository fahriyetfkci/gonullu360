import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    organizationId: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: Role; organizationId: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
};

export const requireRole = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  next();
};

export const requireManager = requireRole(Role.ADMIN);
