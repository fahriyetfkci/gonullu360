import express, { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import * as controller from "./event.controller";
import { asyncHandler } from '../../shared/asyncHandler';
import { prisma } from '../../database/prisma';
import { sendSuccess } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { z } from 'zod';
import {
  createEventGroupSchema,
  createEventSchema,
  eventParamsSchema,
  listEventsSchema,
  updateEventSchema,
} from "./event.schema";

export const eventRouter = Router();

eventRouter.use(authenticate, authorize("ADMIN"));
eventRouter.get("/options", controller.options);
eventRouter.post("/groups", validate(createEventGroupSchema), controller.createGroup);
eventRouter.post(
  "/poster",
  express.raw({ type: ["image/jpeg", "image/png"], limit: "5mb" }),
  controller.uploadPoster,
);
eventRouter.get("/", validate(listEventsSchema), controller.list);
eventRouter.post("/", validate(createEventSchema), controller.create);
eventRouter.get("/:id", validate(eventParamsSchema), controller.get);
eventRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).parse(req.body.status);
  const result = await prisma.event.updateMany({ where: { id: String(req.params.id), orgId: req.user!.orgId, status: { not: 'ARCHIVED' } }, data: { status } });
  if (!result.count) throw new NotFoundError('Etkinlik bulunamadı');
  sendSuccess(res, { status });
}));
eventRouter.post('/:id/participants', asyncHandler(async (req, res) => {
  const volunteerId = z.number().int().positive().parse(req.body.volunteerId);
  const eventId = String(req.params.id), organizationId = req.user!.orgId;
  if (!await prisma.event.count({ where: { id: eventId, orgId: organizationId, status: { not: 'ARCHIVED' } } }) ||
      !await prisma.volunteer.count({ where: { id: volunteerId, organizationId } })) throw new NotFoundError('Etkinlik veya gönüllü bulunamadı');
  const participant = await prisma.eventParticipant.upsert({ where: { volunteerId_eventId: { volunteerId, eventId } }, create: { volunteerId, eventId }, update: {} });
  sendSuccess(res, participant, 201);
}));
eventRouter.put("/:id", validate(updateEventSchema), controller.update);
eventRouter.delete("/:id", validate(eventParamsSchema), controller.archive);
