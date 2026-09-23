import { Router, json } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../shared/response";
import { profileSchema } from "./profile.schema";
import { getProfile, updateProfile } from "./profile.service";

export const profileRouter = Router();
profileRouter.use(authenticate);
profileRouter.get("/profile", async (req, res, next) => {
  try { sendSuccess(res, await getProfile(req.user!.id, req.user!.orgId)); }
  catch (error) { next(error); }
});
profileRouter.put("/profile", json({ limit: "2mb" }), validate(profileSchema), async (req, res, next) => {
  try { sendSuccess(res, await updateProfile(req.user!.id, req.user!.orgId, req.body)); }
  catch (error) { next(error); }
});
