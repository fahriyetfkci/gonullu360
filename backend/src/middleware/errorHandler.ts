import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";
import { sendError } from "../shared/response";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.too.large") {
    sendError(res, 413, "Yüklenen dosya izin verilen boyutu aşıyor", "PAYLOAD_TOO_LARGE");
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    sendError(res, 422, message, "VALIDATION_ERROR");
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.code);
    return;
  }

  console.error("Unhandled request error", {
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
  });
  sendError(res, 500, "Sunucu hatası oluştu", "INTERNAL_ERROR");
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route ${req.method} ${req.path} bulunamadı`, "NOT_FOUND");
}
