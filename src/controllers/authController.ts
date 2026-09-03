import { Router, Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createRateLimiter } from '../middleware/operations';
import { createOtpAuthUrl, generateMfaSecret, verifyTotp } from '../security/totp';
import { writeAudit } from '../services/audit';
import { sendEmailVerification, sendPasswordResetCode } from '../services/email';
import { hashPassword, isStrongPassword, needsPasswordRehash, verifyPassword } from '../security/password';
import { cookieOptions, CSRF_COOKIE, generateCsrfToken, REFRESH_COOKIE } from '../security/csrf';
import { csrfProtect } from '../middleware/csrf';

const router = Router();
const maxFailedAttempts = 5;
const lockDurationMs = 15 * 60 * 1000;
const refreshDurationMs = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => crypto.randomBytes(48).toString('base64url');
const backupHash = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const passwordResetDurationMs = 10 * 60 * 1000;

function setSessionCookies(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(true));
  res.cookie(CSRF_COOKIE, generateCsrfToken(), cookieOptions(false));
}

function clearSessionCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(true), maxAge: undefined });
  res.clearCookie(CSRF_COOKIE, { ...cookieOptions(false), maxAge: undefined });
}

type TokenUser = { id: string; email: string; role: Role; organizationId: string };
const signAccessToken = (user: TokenUser) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
  config.jwtSecret,
  { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
);

async function issueRefreshSession(userId: string, req: Request) {
  const token = newRefreshToken();
  const session = await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      deviceInfo: req.body?.deviceInfo ? String(req.body.deviceInfo) : null,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || null,
      expiresAt: new Date(Date.now() + refreshDurationMs),
    },
  });
  return { token, session };
}

const safeUser = (user: TokenUser & { name: string; isVerified: boolean; mfaEnabled: boolean }) => ({
  id: user.id,
  organizationId: user.organizationId,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  mfaEnabled: user.mfaEnabled,
});

router.post('/login',
  createRateLimiter(15 * 60 * 1000, 20, undefined, 'rl:login:ip:'),
  createRateLimiter(15 * 60 * 1000, 10, req => `${String(req.body?.organizationSlug || '').toLowerCase()}:${String(req.body?.email || '').toLowerCase()}`, 'rl:login:account:'),
  async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const organizationSlug = String(req.body?.organizationSlug || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password || !organizationSlug) return res.status(400).json({ error: 'Organizasyon, e-posta ve şifre zorunludur' });

  const user = await prisma.user.findFirst({ where: { email, organization: { slug: organizationSlug } }, include: { organization: true } });
  if (!user) {
    await writeAudit(req, 'LOGIN_FAILED_UNKNOWN_USER', null, null, { email });
    return res.status(401).json({ error: 'Email veya şifre hatalı' });
  }
  if (!user.isActive || !user.organization.isActive) return res.status(403).json({ error: 'Hesap veya organizasyon aktif değil' });
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({ error: 'Hesap geçici olarak kilitli', lockedUntil: user.lockedUntil });
  }

  if (!await verifyPassword(user.password, password)) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = failedLoginAttempts >= maxFailedAttempts ? new Date(Date.now() + lockDurationMs) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: lockedUntil ? 0 : failedLoginAttempts, lockedUntil } });
    await writeAudit(req, 'LOGIN_FAILED_PASSWORD', user.id, user.organizationId, { locked: Boolean(lockedUntil) });
    return res.status(401).json({ error: 'Email veya şifre hatalı', attemptsRemaining: Math.max(0, maxFailedAttempts - failedLoginAttempts) });
  }

  if (!user.isVerified) return res.status(403).json({ error: 'E-posta adresinizi doğrulamanız gerekiyor' });

  if (user.mfaEnabled) {
    const mfaCode = String(req.body?.mfaCode || '');
    const backupCode = String(req.body?.backupCode || '');
    let mfaValid = Boolean(user.mfaSecret && verifyTotp(user.mfaSecret, mfaCode));
    if (!mfaValid && backupCode && user.backupCodesHash) {
      const hashes = JSON.parse(user.backupCodesHash) as string[];
      const index = hashes.indexOf(backupHash(backupCode));
      if (index >= 0) {
        hashes.splice(index, 1);
        await prisma.user.update({ where: { id: user.id }, data: { backupCodesHash: JSON.stringify(hashes) } });
        mfaValid = true;
      }
    }
    if (!mfaValid) {
      if (!mfaCode && !backupCode) return res.status(202).json({ mfaRequired: true, message: 'MFA kodu gereklidir' });
      await writeAudit(req, 'LOGIN_FAILED_MFA', user.id, user.organizationId);
      return res.status(401).json({ error: 'MFA kodu geçersiz', mfaRequired: true });
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), ...(needsPasswordRehash(user.password) ? { password: await hashPassword(password) } : {}) } });
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshSession(user.id, req);
  await writeAudit(req, 'LOGIN_SUCCESS', user.id, user.organizationId, { sessionId: refresh.session.id });
  setSessionCookies(res, refresh.token);
  return res.json({ user: safeUser(user), token: accessToken, accessToken, expiresIn: config.jwtExpiresIn });
});

router.post('/register', createRateLimiter(60 * 60 * 1000, 5), async (req: Request, res: Response) => {
  const organizationSlug = String(req.body?.organizationSlug || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!organizationSlug || name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !isStrongPassword(password)) return res.status(422).json({ error: 'Organizasyon, isim, geçerli e-posta ve güçlü şifre zorunludur' });
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });
  if (!organization?.isActive) return res.status(404).json({ error: 'Organizasyon bulunamadı' });
  const existing = await prisma.user.findUnique({ where: { organizationId_email: { organizationId: organization.id, email } } });
  if (existing) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
  const token = crypto.randomBytes(32).toString('hex');
  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({ data: { organizationId: organization.id, name, email, password: await hashPassword(password), role: Role.VOLUNTEER, isVerified: false } });
    await tx.emailVerificationToken.create({ data: { userId: created.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + config.emailVerifyTokenTtl * 1000) } });
    return created;
  });
  const emailSent = await sendEmailVerification(email, token).catch(() => false);
  await writeAudit(req, 'REGISTER', user.id, organization.id);
  return res.status(201).json({ message: 'Kayıt oluşturuldu. E-posta adresinizi doğrulayın.', emailSent, ...(config.appMode === 'demo' && !emailSent ? { demoVerificationToken: token } : {}) });
});

router.post('/verify-email', createRateLimiter(60 * 60 * 1000, 10), async (req: Request, res: Response) => {
  const token = String(req.body?.token || '');
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    prisma.emailVerificationToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await writeAudit(req, 'EMAIL_VERIFY_SUCCESS', record.userId, record.user.organizationId);
  return res.json({ message: 'E-posta adresi doğrulandı' });
});

router.post('/resend-verification', createRateLimiter(60 * 60 * 1000, 5, req => `${ipKeyGenerator(req.ip || 'unknown')}:${String(req.body?.email || '').toLowerCase()}`, 'rl:verify:'), async (req: Request, res: Response) => {
  const organizationSlug = String(req.body?.organizationSlug || '').trim().toLowerCase();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = 'E-posta kayıtlı ve doğrulanmamışsa yeni doğrulama bağlantısı gönderildi.';
  const user = await prisma.user.findFirst({ where: { email, isVerified: false, isActive: true, organization: { slug: organizationSlug, isActive: true } } });
  if (!user) return res.json({ message });
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + config.emailVerifyTokenTtl * 1000) } }),
  ]);
  const emailSent = await sendEmailVerification(email, token).catch(() => false);
  await writeAudit(req, 'EMAIL_VERIFY_RESEND', user.id, user.organizationId);
  return res.json({ message, emailSent, ...(config.appMode === 'demo' && !emailSent ? { demoVerificationToken: token } : {}) });
});

router.post('/forgot-password', createRateLimiter(15 * 60 * 1000, 5, req => `${ipKeyGenerator(req.ip || 'unknown')}:${String(req.body?.email || '').toLowerCase()}`, 'rl:password:'), async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const organizationSlug = String(req.body?.organizationSlug || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'E-posta adresi zorunludur' });
  const message = 'Bu e-posta kayıtlıysa parola sıfırlama doğrulama kodu gönderilmiştir.';
  const user = await prisma.user.findFirst({ where: { email, isActive: true, organization: { isActive: true, ...(organizationSlug ? { slug: organizationSlug } : {}) } } });
  if (!user) {
    await writeAudit(req, 'PASSWORD_RESET_REQUEST_UNKNOWN_USER', null, null, { email });
    if (config.appMode === 'demo') return res.status(404).json({ error: 'Bu e-posta adresi sistemde kayıtlı değil.' });
    return res.json({ message });
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(`${email}:${code}`), expiresAt: new Date(Date.now() + passwordResetDurationMs) } }),
  ]);
  const emailSent = await sendPasswordResetCode(email, code);
  await writeAudit(req, 'PASSWORD_RESET_REQUESTED', user.id, user.organizationId);
  return res.json({
    message,
    emailSent,
    ...(config.appMode === 'demo' && !emailSent ? { demoCode: code } : {}),
  });
});

router.post('/reset-password', createRateLimiter(15 * 60 * 1000, 10), async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').replace(/\D/g, '');
  const password = String(req.body?.password || '');
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'E-posta ve 6 haneli doğrulama kodu zorunludur' });
  if (password.length < 10 || !/[a-zçğıöşü]/i.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ error: 'Şifre en az 10 karakter olmalı ve harf ile rakam içermelidir' });
  }
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(`${email}:${code}`) }, include: { user: true } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date() || !reset.user.isActive) {
    return res.status(400).json({ error: 'Doğrulama kodu geçersiz veya süresi dolmuş' });
  }
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: reset.userId }, data: { password: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null } });
    await tx.passwordResetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.refreshSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  await writeAudit(req, 'PASSWORD_RESET_COMPLETED', reset.userId, reset.user.organizationId);
  return res.json({ message: 'Şifreniz başarıyla yenilendi. Yeni şifrenizle giriş yapabilirsiniz.' });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const currentToken = String(req.signedCookies?.[REFRESH_COOKIE] || req.body?.refreshToken || '');
  if (!currentToken) return res.status(401).json({ error: 'Refresh token bulunamadı' });
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(currentToken) }, include: { user: { include: { organization: true } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive || !session.user.organization.isActive) {
    return res.status(401).json({ error: 'Refresh token geçersiz veya süresi dolmuş' });
  }
  const nextToken = newRefreshToken();
  const nextSession = await prisma.$transaction(async tx => {
    const created = await tx.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(nextToken),
        deviceInfo: session.deviceInfo,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || null,
        expiresAt: new Date(Date.now() + refreshDurationMs),
      },
    });
    await tx.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), replacedByTokenId: created.id } });
    return created;
  });
  await writeAudit(req, 'TOKEN_REFRESHED', session.userId, session.user.organizationId, { sessionId: nextSession.id });
  setSessionCookies(res, nextToken);
  const accessToken = signAccessToken(session.user);
  return res.json({ token: accessToken, accessToken, expiresIn: config.jwtExpiresIn });
});

router.post('/logout', csrfProtect, async (req: Request, res: Response) => {
  const refreshToken = String(req.signedCookies?.[REFRESH_COOKIE] || req.body?.refreshToken || '');
  if (refreshToken) {
    const session = await prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(refreshToken) }, include: { user: true } });
    if (session && !session.revokedAt) {
      await prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await writeAudit(req, 'LOGOUT', session.userId, session.user.organizationId, { sessionId: session.id });
    }
  }
  clearSessionCookies(res);
  return res.json({ message: 'Oturum kapatıldı' });
});

router.post('/logout-all', csrfProtect, authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.refreshSession.updateMany({ where: { userId: req.user!.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await writeAudit(req, 'LOGOUT_ALL', req.user!.id, req.user!.organizationId);
  clearSessionCookies(res);
  return res.json({ message: 'Tüm cihazlardaki oturumlar kapatıldı' });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, organizationId: true, name: true, email: true, role: true, isVerified: true, mfaEnabled: true } });
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  return res.json({ user });
});

router.post('/mfa/setup', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  const secret = generateMfaSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret, mfaEnabled: false, backupCodesHash: null } });
  await writeAudit(req, 'MFA_SETUP_STARTED', user.id, user.organizationId);
  return res.json({ secret, otpAuthUrl: createOtpAuthUrl(secret, user.email) });
});

router.post('/mfa/enable', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const code = String(req.body?.code || '');
  if (!user?.mfaSecret || !verifyTotp(user.mfaSecret, code)) return res.status(400).json({ error: 'MFA kodu geçersiz' });
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, backupCodesHash: JSON.stringify(backupCodes.map(backupHash)) } });
  await writeAudit(req, 'MFA_ENABLED', user.id, user.organizationId);
  return res.json({ message: 'MFA etkinleştirildi', backupCodes });
});

router.post('/mfa/disable', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !await verifyPassword(user.password, String(req.body?.password || ''))) return res.status(401).json({ error: 'Şifre hatalı' });
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null, backupCodesHash: null } });
  await writeAudit(req, 'MFA_DISABLED', user.id, user.organizationId);
  return res.json({ message: 'MFA devre dışı bırakıldı' });
});

export default router;
