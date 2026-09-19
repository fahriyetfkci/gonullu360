import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import * as controller from "./form.controller";
import { draftQuerySchema, publishRequestSchema, publishedQuerySchema, saveDraftRequestSchema } from "./form.schema";
import { asyncHandler } from '../../shared/asyncHandler';
import { prisma } from '../../database/prisma';
import { sendSuccess } from '../../shared/response';

export const formRouter = Router();
formRouter.get('/', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  sendSuccess(res, await prisma.form.findMany({ where: { orgId: req.user!.orgId }, orderBy: { updatedAt: 'desc' }, select: { id: true, clientFormId: true, title: true, publishedVersion: true } }));
}));

formRouter.get("/draft", authenticate, authorize("ADMIN"), validate(draftQuerySchema), controller.getDraft);
formRouter.put("/draft", authenticate, authorize("ADMIN"), validate(saveDraftRequestSchema), controller.saveDraft);
formRouter.post("/publish", authenticate, authorize("ADMIN"), validate(publishRequestSchema), controller.publish);
formRouter.get("/published", validate(publishedQuerySchema), controller.getPublished);
