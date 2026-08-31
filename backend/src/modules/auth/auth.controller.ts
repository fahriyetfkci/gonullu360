import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/response";
import { clearCsrfCookie, clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE, setCsrfCookie, setRefreshTokenCookie } from "../../utils/cookie";
import { generateCsrfToken } from "../../utils/csrf";
import { UnauthorizedError } from "../../shared/errors";
import * as authService from "./auth.service";
import {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResendVerificationBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schema";

function getMeta(req: Request): { ipAddress: string; userAgent?: string } {
  return {
    ipAddress: req.ip ?? "unknown",
    userAgent: req.headers["user-agent"],
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body as RegisterBody, getMeta(req));
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await authService.login(req.body as LoginBody, getMeta(req));

    setRefreshTokenCookie(res, tokens.refreshToken);

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    sendSuccess(res, { accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawRefreshToken = req.signedCookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedError("Refresh token bulunamadı");
    }

    const tokens = await authService.refresh(rawRefreshToken, getMeta(req));

    setRefreshTokenCookie(res, tokens.refreshToken);

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    sendSuccess(res, { accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawRefreshToken = req.signedCookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken, getMeta(req));
    }

    clearRefreshTokenCookie(res);
    clearCsrfCookie(res);

    sendSuccess(res, { message: "Çıkış yapıldı" });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    await authService.logoutAll(req.user.id, getMeta(req));

    clearRefreshTokenCookie(res);
    clearCsrfCookie(res);

    sendSuccess(res, { message: "Tüm cihazlardan çıkış yapıldı" });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body as ForgotPasswordBody, getMeta(req));
    // Always success to not reveal email existence
    sendSuccess(res, { message: "Eğer bu email kayıtlıysa sıfırlama linki gönderildi" });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body as ResetPasswordBody, getMeta(req));
    sendSuccess(res, { message: "Şifre başarıyla güncellendi" });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.verifyEmail(req.body as VerifyEmailBody, getMeta(req));
    sendSuccess(res, { message: "Email başarıyla doğrulandı" });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resendVerification(req.body as ResendVerificationBody, getMeta(req));
    sendSuccess(res, { message: "Eğer bu email kayıtlıysa doğrulama linki gönderildi" });
  } catch (err) {
    next(err);
  }
}

