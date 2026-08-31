import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../shared/errors";
import { verifyAccessToken } from "../utils/token";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Bearer token required"));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      role: payload.role,
    };
    req.sessionId = payload.sessionId;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

