import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { csrfProtect } from "../../middleware/csrfProtect";
import {
  loginIpRateLimit,
  loginTenantRateLimit,
  sensitiveEndpointRateLimit,
} from "../../middleware/rateLimiter";
import { validate } from "../../middleware/validate";
import * as controller from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema";

export const authRouter = Router();

// Public — no CSRF needed (no state-changing cookies exist yet at these points)
authRouter.post(
  "/register",
  validate(registerSchema),
  controller.register
);

authRouter.post(
  "/login",
  loginIpRateLimit,
  loginTenantRateLimit,
  validate(loginSchema),
  controller.login
);

// Cookie-bearing refresh — CSRF not required because the endpoint only accepts
// the HttpOnly cookie (which JS cannot read/forge); however we still validate the JWT.
authRouter.post("/refresh", controller.refresh);

// These mutate state via cookies — CSRF protection required
authRouter.post("/logout", csrfProtect, controller.logout);

authRouter.post("/logout-all", csrfProtect, authenticate, controller.logoutAll);

authRouter.get("/me", authenticate, controller.me);

authRouter.post(
  "/forgot-password",
  sensitiveEndpointRateLimit,
  validate(forgotPasswordSchema),
  controller.forgotPassword
);

authRouter.post(
  "/reset-password",
  sensitiveEndpointRateLimit,
  validate(resetPasswordSchema),
  controller.resetPassword
);

authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  controller.verifyEmail
);

authRouter.post(
  "/resend-verification",
  sensitiveEndpointRateLimit,
  validate(resendVerificationSchema),
  controller.resendVerification
);

