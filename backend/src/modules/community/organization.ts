import { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../../shared/errors';

export interface OrganizationRequest extends Request { organizationId?: string }

export const organizationContext: RequestHandler = (req: OrganizationRequest, _res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  req.organizationId = req.user.orgId;
  next();
};
