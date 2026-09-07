import { NextFunction, Request, Response } from "express";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import { sendSuccess } from "../../shared/response";
import * as eventService from "./event.service";
import { savePoster } from "./poster.service";
import { CreateEventGroupBody, EventInput, EventParams, ListEventsQuery } from "./event.schema";

function userFrom(req: Request): NonNullable<Request["user"]> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userFrom(req);
    sendSuccess(res, await eventService.listEvents(user.orgId, req.query as unknown as ListEventsQuery));
  } catch (error) {
    next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userFrom(req);
    sendSuccess(res, await eventService.getEvent(user.orgId, (req.params as EventParams).id));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userFrom(req);
    sendSuccess(res, await eventService.createEvent(user.orgId, user.id, req.body as EventInput), 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userFrom(req);
    sendSuccess(res, await eventService.updateEvent(user.orgId, (req.params as EventParams).id, req.body as EventInput));
  } catch (error) {
    next(error);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = userFrom(req);
    sendSuccess(res, await eventService.archiveEvent(user.orgId, (req.params as EventParams).id));
  } catch (error) {
    next(error);
  }
}

export async function options(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await eventService.getOptions(userFrom(req).orgId));
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await eventService.createGroup(userFrom(req).orgId, req.body as CreateEventGroupBody), 201);
  } catch (error) {
    next(error);
  }
}

export async function uploadPoster(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new ValidationError("Afiş dosyası zorunludur");
    sendSuccess(res, await savePoster(req.body, req.get("content-type")), 201);
  } catch (error) {
    next(error);
  }
}
