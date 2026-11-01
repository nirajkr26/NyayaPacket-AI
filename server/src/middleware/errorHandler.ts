import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const reqId = req.id || "unknown";

  // Log error with context
  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn({ reqId, err: err.message, code: err.code }, "Client error");
  } else {
    logger.error({ reqId, err: err.stack || err.message }, "Unhandled server error");
  }

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return sendError(res, "VALIDATION_ERROR", "Invalid input parameters", 422, details);
  }

  // 2. Custom Application Error
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 3. SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && "body" in err) {
    return sendError(res, "INVALID_JSON", "Malformed JSON request body", 400);
  }

  // 4. Default 500 Internal Server Error
  const message =
    env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred"
      : err.message || "Internal server error";

  return sendError(res, "INTERNAL_SERVER_ERROR", message, 500);
}
