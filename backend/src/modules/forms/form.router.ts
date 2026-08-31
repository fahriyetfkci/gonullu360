import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import * as controller from "./form.controller";
import { draftQuerySchema, publishRequestSchema, publishedQuerySchema, saveDraftRequestSchema } from "./form.schema";

export const formRouter = Router();

formRouter.get("/draft", authenticate, authorize("ADMIN"), validate(draftQuerySchema), controller.getDraft);
formRouter.put("/draft", authenticate, authorize("ADMIN"), validate(saveDraftRequestSchema), controller.saveDraft);
formRouter.post("/publish", authenticate, authorize("ADMIN"), validate(publishRequestSchema), controller.publish);
formRouter.get("/published", validate(publishedQuerySchema), controller.getPublished);
