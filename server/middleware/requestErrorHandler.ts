import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Let Express close an incomplete response instead of attempting a second one.
  if (res.headersSent) return next(err);

  const candidate = err?.status ?? err?.statusCode;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
    ? candidate : 500;
  if (status >= 500) {
    logger.error("Unhandled request error", err, { source: "http" });
  }
  const message = status >= 500
    ? "Internal Server Error"
    : err?.type === "entity.parse.failed"
      ? "Invalid JSON body"
      : typeof err?.message === "string" && err.message
        ? err.message : "Request failed";
  res.status(status).json({ message });
};
