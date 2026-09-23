import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/response";
import { UnauthorizedError } from "../../shared/errors";
import { DraftQuery, PublishBody, PublishedQuery, SaveDraftBody } from "./form.schema";
import * as formService from "./form.service";

export async function getDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    sendSuccess(res, await formService.getDraft(req.user.orgId, req.query as DraftQuery));
  } catch (error) {
    next(error);
  }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    sendSuccess(res, await formService.saveDraft(req.user.orgId, req.user.id, req.body as SaveDraftBody));
  } catch (error) {
    next(error);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    sendSuccess(res, await formService.publish(req.user.orgId, req.user.id, req.body as PublishBody), 201);
  } catch (error) {
    next(error);
  }
}

export async function getPublished(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await formService.getPublished(req.query as PublishedQuery));
  } catch (error) {
    next(error);
  }
}
