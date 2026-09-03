import crypto from 'crypto';
import { config } from '../config';

export const REFRESH_COOKIE = 'rf_token';
export const CSRF_COOKIE = 'csrf_token';

export function generateCsrfToken() {
  const random = crypto.randomBytes(24).toString('hex');
  const mac = crypto.createHmac('sha256', config.csrfSecret).update(random).digest('hex');
  return `${random}.${mac}`;
}

export function verifyCsrfToken(token: string) {
  const [random, mac, extra] = token.split('.');
  if (!random || !mac || extra || !/^[a-f0-9]+$/i.test(random) || !/^[a-f0-9]+$/i.test(mac)) return false;
  const expected = crypto.createHmac('sha256', config.csrfSecret).update(random).digest('hex');
  return mac.length === expected.length && crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
}

export function cookieOptions(httpOnly: boolean) {
  return { httpOnly, signed: httpOnly, secure: config.nodeEnv === 'production', sameSite: (config.nodeEnv === 'production' ? 'strict' : 'lax') as 'strict'|'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 };
}
