import { Response } from "express";
import { env } from "../config/env";

export const REFRESH_TOKEN_COOKIE = "rf_token";
export const CSRF_TOKEN_COOKIE = "csrf_token";

export function setRefreshTokenCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === "production";
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    signed: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: sevenDaysMs,
    path: "/api/auth",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    signed: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/auth",
  });
}

export function setCsrfCookie(res: Response, token: string): void {
  // Not httpOnly — frontend JS needs to read and send it back
  res.cookie(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_TOKEN_COOKIE, { path: "/" });
}

