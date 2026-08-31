import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { authRouter } from "./modules/auth/auth.router";
import { formRouter } from "./modules/forms/form.router";

export function createApp(): express.Application {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }));

  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(requestLogger);
  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.use("/api/auth", authRouter);
  app.use("/api/forms", formRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
