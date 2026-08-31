import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../shared/errors";

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError("Bu işlem için yönetici yetkisi gereklidir"));
      return;
    }
    next();
  };
}
