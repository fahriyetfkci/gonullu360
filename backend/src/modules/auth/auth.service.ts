import { User } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import { redis } from "../../database/redis";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../shared/errors";
import { logger } from "../../utils/logger";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  generateSecureToken,
  getRefreshTokenExpiresAt,
  hashToken,
  signAccessToken,
} from "../../utils/token";
import { writeAuditLog } from "./audit.service";
import {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResendVerificationBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schema";
import {
  buildResetPasswordHtml,
  buildVerifyEmailHtml,
  sendMail,
} from "../../utils/email";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const PROGRESSIVE_DELAYS = [0, 0, 1000, 2000, 4000];

interface RequestMeta {
  ipAddress: string;
  userAgent?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

interface AuthUserProfile {
  id: string;
  orgId: string;
  email: string;
  role: User["role"];
  isVerified: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getOrgBySlug(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
}> {
  const org = await prisma.organization.findUnique({ where: { slug } });

  if (!org || !org.isActive) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return org;
}

async function applyProgressiveDelay(failedAttempts: number): Promise<void> {
  const delayMs =
    PROGRESSIVE_DELAYS[
      Math.min(failedAttempts, PROGRESSIVE_DELAYS.length - 1)
    ];

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function createSession(
  userId: string,
  meta: RequestMeta,
): Promise<AuthTokens> {
  const rawRefreshToken = generateSecureToken(32);
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  const session = await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const accessToken = signAccessToken({
    sub: userId,
    orgId: user.orgId,
    email: user.email,
    role: user.role,
    sessionId: session.id,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId: session.id,
  };
}

async function issueEmailVerificationToken(
  user: User,
  orgId: string,
): Promise<void> {
  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);

  await redis.setex(
    `ev:${tokenHash}`,
    env.EMAIL_VERIFY_TOKEN_TTL,
    JSON.stringify({ userId: user.id, orgId }),
  );

  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Verify your email",
    html: buildVerifyEmailHtml(verifyUrl),
  });
}

async function issueEmailVerificationTokenBestEffort(
  user: User,
  orgId: string,
): Promise<void> {
  try {
    await issueEmailVerificationToken(user, orgId);
  } catch (err) {
    logger.error("Failed to issue email verification token", {
      userId: user.id,
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function sendPasswordResetEmailBestEffort(
  userId: string,
  orgId: string,
  email: string,
): Promise<void> {
  try {
    const token = generateSecureToken(32);
    const tokenHash = hashToken(token);

    await redis.setex(
      `pr:${tokenHash}`,
      env.RESET_PASSWORD_TOKEN_TTL,
      JSON.stringify({ userId, orgId }),
    );

    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your password",
      html: buildResetPasswordHtml(resetUrl),
    });
  } catch (err) {
    logger.error("Failed to send password reset email", {
      userId,
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function register(
  body: RegisterBody,
  meta: RequestMeta,
): Promise<{ userId: string }> {
  const org = await getOrgBySlug(body.organizationSlug);

  const existing = await prisma.user.findUnique({
    where: { orgId_email: { orgId: org.id, email: body.email } },
  });

  if (existing) {
    throw new ConflictError("This email is already registered");
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      email: body.email,
      passwordHash,
      role: "VOLUNTEER",
    },
  });

  await issueEmailVerificationTokenBestEffort(user, org.id);

  await writeAuditLog({
    action: "REGISTER",
    orgId: org.id,
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { userId: user.id };
}

export async function login(
  body: LoginBody,
  meta: RequestMeta,
): Promise<AuthTokens> {
  const org = await getOrgBySlug(body.organizationSlug);

  const user = await prisma.user.findUnique({
    where: { orgId_email: { orgId: org.id, email: body.email } },
  });

  await applyProgressiveDelay(user?.failedLoginAttempts ?? MAX_FAILED_ATTEMPTS);

  if (!user || !user.isActive) {
    await writeAuditLog({
      action: "LOGIN_FAILURE",
      orgId: org.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { reason: "user_not_found" },
    });

    throw new UnauthorizedError("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await writeAuditLog({
      action: "LOGIN_FAILURE",
      orgId: org.id,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { reason: "account_locked", lockedUntil: user.lockedUntil },
    });

    throw new UnauthorizedError(
      "Your account is temporarily locked. Please try again later.",
    );
  }

  const passwordMatch = await verifyPassword(user.passwordHash, body.password);

  if (!passwordMatch) {
    const newFailedCount = user.failedLoginAttempts + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCK_DURATION_MS)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newFailedCount, lockedUntil },
    });

    if (shouldLock) {
      await writeAuditLog({
        action: "ACCOUNT_LOCKED",
        orgId: org.id,
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { lockedUntil },
      });
    }

    await writeAuditLog({
      action: "LOGIN_FAILURE",
      orgId: org.id,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        reason: "invalid_password",
        failedAttempts: newFailedCount,
      },
    });

    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.isVerified) {
    await writeAuditLog({
      action: "LOGIN_FAILURE",
      orgId: org.id,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { reason: "email_not_verified" },
    });

    throw new UnauthorizedError("Please verify your email before logging in");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const tokens = await createSession(user.id, meta);

  await writeAuditLog({
    action: "LOGIN_SUCCESS",
    orgId: org.id,
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return tokens;
}

export async function refresh(
  rawRefreshToken: string,
  meta: RequestMeta,
): Promise<AuthTokens> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
  });

  if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
    await writeAuditLog({
      action: "TOKEN_REFRESH_FAILURE",
      userId: session?.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        reason: session?.revokedAt ? "reuse_detected" : "session_not_found",
      },
    });

    if (session?.userId && session.revokedAt) {
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const newTokens = await createSession(session.userId, meta);

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenId: newTokens.sessionId,
    },
  });

  await writeAuditLog({
    action: "TOKEN_REFRESH",
    userId: session.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return newTokens;
}

export async function logout(
  rawRefreshToken: string,
  meta: RequestMeta,
): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
  });

  if (session && !session.revokedAt) {
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog({
      action: "LOGOUT",
      userId: session.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export async function logoutAll(
  userId: string,
  meta: RequestMeta,
): Promise<void> {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    action: "LOGOUT_ALL",
    userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function getMe(
  userId: string,
): Promise<AuthUserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      orgId: true,
      email: true,
      role: true,
      isVerified: true,
      isActive: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

export async function forgotPassword(
  body: ForgotPasswordBody,
  meta: RequestMeta,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { slug: body.organizationSlug },
  });

  if (!org || !org.isActive) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { orgId_email: { orgId: org.id, email: body.email } },
  });

  if (!user || !user.isActive) {
    return;
  }

  await sendPasswordResetEmailBestEffort(user.id, org.id, user.email);

  await writeAuditLog({
    action: "PASSWORD_RESET_REQUEST",
    orgId: org.id,
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function resetPassword(
  body: ResetPasswordBody,
  meta: RequestMeta,
): Promise<void> {
  const tokenHash = hashToken(body.token);
  const stored = await redis.get(`pr:${tokenHash}`);

  if (!stored) {
    throw new ValidationError("Invalid or expired token");
  }

  const { userId, orgId } = JSON.parse(stored) as {
    userId: string;
    orgId: string;
  };

  const passwordHash = await hashPassword(body.password);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await redis.del(`pr:${tokenHash}`);

  await writeAuditLog({
    action: "PASSWORD_RESET_SUCCESS",
    orgId,
    userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function verifyEmail(
  body: VerifyEmailBody,
  meta: RequestMeta,
): Promise<void> {
  const tokenHash = hashToken(body.token);
  const stored = await redis.get(`ev:${tokenHash}`);

  if (!stored) {
    throw new ValidationError("Invalid or expired verification token");
  }

  const { userId, orgId } = JSON.parse(stored) as {
    userId: string;
    orgId: string;
  };

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  await redis.del(`ev:${tokenHash}`);

  await writeAuditLog({
    action: "EMAIL_VERIFY_SUCCESS",
    orgId,
    userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function resendVerification(
  body: ResendVerificationBody,
  meta: RequestMeta,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { slug: body.organizationSlug },
  });

  if (!org || !org.isActive) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { orgId_email: { orgId: org.id, email: body.email } },
  });

  if (!user || !user.isActive || user.isVerified) {
    return;
  }

  await issueEmailVerificationTokenBestEffort(user, org.id);

  await writeAuditLog({
    action: "EMAIL_VERIFY_RESEND",
    orgId: org.id,
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

