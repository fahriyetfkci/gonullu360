import { Request, Response, NextFunction } from 'express';
import { CSRF_COOKIE, verifyCsrfToken } from '../security/csrf';

export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  const cookie = String(req.cookies?.[CSRF_COOKIE] || '');
  const header = String(req.get('x-csrf-token') || '');
  if (!cookie || cookie !== header || !verifyCsrfToken(header)) return res.status(403).json({ error: 'CSRF doğrulaması başarısız', code: 'CSRF_INVALID' });
  next();
}
