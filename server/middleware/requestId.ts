/**
 * server/middleware/requestId.ts
 *
 * Two cooperating middlewares:
 *
 *  1. requestId  — attaches a unique x-request-id to every request & response.
 *     If the upstream proxy already set x-request-id, that value is reused.
 *     Also available as req.requestId for downstream handlers and Sentry.
 *
 *  2. slowRequestLogger — measures response time and logs a warning when the
 *     request takes longer than SLOW_WARN_MS (default 500ms) or an error when
 *     it takes longer than SLOW_ERROR_MS (default 2000ms).
 *     Also replaces the existing inline logger in server/index.ts.
 */

import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { logger } from "../lib/logger";
import * as Sentry from "@sentry/node";

// Thresholds
const SLOW_WARN_MS = Number(process.env.SLOW_WARN_MS ?? 500);
const SLOW_ERROR_MS = Number(process.env.SLOW_ERROR_MS ?? 2000);

// ── Extend Express Request ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/** Generate a compact 16-char hex request ID. */
function newRequestId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Middleware 1: attach a unique request ID to every request.
 * Reuses x-request-id if forwarded by a trusted proxy (e.g. nginx).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers["x-request-id"] as string | undefined;
  const id = incomingId?.trim() || newRequestId();

  req.requestId = id;
  req.startTime = Date.now();

  // Echo back so the client can correlate logs
  res.setHeader("x-request-id", id);

  // Add to Sentry scope so all errors in this request carry the ID
  Sentry.getCurrentScope().setTag("request_id", id);

  next();
}

/**
 * Middleware 2: log every /api request with timing and flag slow ones.
 * Mount AFTER requestId so req.requestId is already set.
 */
export function slowRequestLogger(req: Request, res: Response, next: NextFunction): void {
  // Only instrument API paths — static assets don't need timing
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  res.on("finish", () => {
    const durationMs = Date.now() - (req.startTime ?? Date.now());
    const status = res.statusCode;
    const rid = req.requestId ?? "-";
    const line = `${req.method} ${req.path} ${status} ${durationMs}ms [${rid}]`;

    if (durationMs >= SLOW_ERROR_MS) {
      logger.error(`SLOW REQUEST ${line}`, new Error("Slow request"), {
        source: "slowRequestLogger",
        meta: { durationMs, method: req.method, path: req.path, status, requestId: rid },
      });
      // Also tag Sentry so we can filter by slow requests
      Sentry.getCurrentScope().setTag("slow_request", "error");
    } else if (durationMs >= SLOW_WARN_MS) {
      logger.warn(`SLOW REQUEST ${line}`, {
        source: "slowRequestLogger",
        meta: { durationMs, method: req.method, path: req.path, status, requestId: rid },
      });
    } else {
      logger.info(line, { source: "slowRequestLogger" });
    }
  });

  next();
}
