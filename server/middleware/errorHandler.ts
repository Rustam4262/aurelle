import type { Request, Response, NextFunction } from "express";
import { log } from "../index";

// Custom error class with structured data
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, "CONFLICT", details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(422, message, "VALIDATION_ERROR", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests") {
    super(429, message, "TOO_MANY_REQUESTS");
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, message, "INTERNAL_SERVER_ERROR");
  }
}

// Error response format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

// Centralized error handler middleware
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Default to 500 if not an AppError
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code =
    err instanceof AppError ? err.code || "INTERNAL_SERVER_ERROR" : "INTERNAL_SERVER_ERROR";
  const message = err.message || "Internal Server Error";
  const details = err instanceof AppError ? err.details : undefined;

  // Log error (but don't expose stack trace in production)
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (statusCode >= 500) {
    // Server errors - log full details
    console.error("❌ Server Error:", {
      code,
      message,
      path: req.path,
      method: req.method,
      stack: err.stack,
      details,
    });
  } else if (statusCode >= 400 && isDevelopment) {
    // Client errors - log only in development
    console.warn("⚠️  Client Error:", {
      code,
      message,
      path: req.path,
      method: req.method,
    });
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  // Include details if present
  if (details) {
    errorResponse.error.details = details;
  }

  // Include stack trace only in development
  if (isDevelopment && err.stack) {
    (errorResponse.error as any).stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

// Async handler wrapper to catch promise rejections
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found handler (for undefined routes)
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
}
