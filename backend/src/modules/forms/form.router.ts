import { Router } from "express";
import { validate } from "../../middleware/validate";
import * as controller from "./form.controller";
import { draftQuerySchema, publishRequestSchema, saveDraftRequestSchema } from "./form.schema";

export const formRouter = Router();

formRouter.get("/draft", validate(draftQuerySchema), controller.getDraft);
formRouter.put("/draft", validate(saveDraftRequestSchema), controller.saveDraft);
formRouter.post("/publish", validate(publishRequestSchema), controller.publish);
formRouter.get("/published", validate(draftQuerySchema), controller.getPublished);
