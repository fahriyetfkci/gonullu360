import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../shared/errors";
import { CSRF_TOKEN_COOKIE } from "../utils/cookie";
import { verifyCsrfToken } from "../utils/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const csrfHeader = req.headers["x-csrf-token"];
  if (!csrfHeader || typeof csrfHeader !== "string") {
    next(new ForbiddenError("CSRF token missing"));
    return;
  }

  const csrfCookie = req.cookies[CSRF_TOKEN_COOKIE];
  if (!csrfCookie || typeof csrfCookie !== "string") {
    next(new ForbiddenError("CSRF cookie missing"));
    return;
  }

  if (csrfHeader !== csrfCookie) {
    next(new ForbiddenError("CSRF token mismatch"));
    return;
  }

  if (!verifyCsrfToken(csrfHeader)) {
    next(new ForbiddenError("Invalid CSRF token"));
    return;
  }

  next();
}

