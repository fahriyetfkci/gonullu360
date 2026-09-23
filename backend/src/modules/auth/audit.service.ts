import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { logger } from "../../utils/logger";

export type AuditAction =
  | "REGISTER"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "TOKEN_REFRESH"
  | "TOKEN_REFRESH_FAILURE"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_SUCCESS"
  | "EMAIL_VERIFY_SUCCESS"
  | "EMAIL_VERIFY_RESEND";

interface AuditParams {
  action: AuditAction;
  ipAddress: string;
  userAgent?: string;
  orgId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        orgId: params.orgId,
        userId: params.userId,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log", {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

