import express, { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import * as controller from "./event.controller";
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
eventRouter.put("/:id", validate(updateEventSchema), controller.update);
eventRouter.delete("/:id", validate(eventParamsSchema), controller.archive);
