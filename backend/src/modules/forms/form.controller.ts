import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/response";
import { DraftQuery, PublishBody, SaveDraftBody } from "./form.schema";
import * as formService from "./form.service";

export async function getDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await formService.getDraft(req.query as DraftQuery));
  } catch (error) {
    next(error);
  }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await formService.saveDraft(req.body as SaveDraftBody));
  } catch (error) {
    next(error);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await formService.publish(req.body as PublishBody), 201);
  } catch (error) {
    next(error);
  }
}

export async function getPublished(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await formService.getPublished(req.query as DraftQuery));
  } catch (error) {
    next(error);
  }
}
