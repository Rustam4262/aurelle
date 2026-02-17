import * as Sentry from "@sentry/react";

/**
 * Unified logging utility for client-side
 * Integrates with Sentry for production error tracking
 * Disables console.log in production to prevent information leakage
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  source?: string;
  meta?: Record<string, any>;
}

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Check if logging is enabled for this level
 */
function isLoggingEnabled(level: LogLevel): boolean {
  // In production, only log errors and warnings
  if (isProduction) {
    return level === "error" || level === "warn";
  }
  // In development, log everything
  return true;
}

/**
 * Log info message
 */
export function info(message: string, options: LogOptions = {}): void {
  if (!isLoggingEnabled("info")) return;

  console.log(`[INFO]${options.source ? ` [${options.source}]` : ""} ${message}`);

  if (options.meta) {
    console.log(options.meta);
  }

  // Add breadcrumb for Sentry
  Sentry.addBreadcrumb({
    category: options.source || "app",
    message,
    level: "info",
    data: options.meta,
  });
}

/**
 * Log warning message
 */
export function warn(message: string, options: LogOptions = {}): void {
  if (!isLoggingEnabled("warn")) return;

  console.warn(`[WARN]${options.source ? ` [${options.source}]` : ""} ${message}`);

  if (options.meta) {
    console.warn(options.meta);
  }

  // Send to Sentry
  Sentry.captureMessage(message, {
    level: "warning",
    extra: options.meta,
    tags: {
      source: options.source || "client",
    },
  });
}

/**
 * Log error message and capture to Sentry
 */
export function error(
  message: string,
  err?: Error | unknown,
  options: LogOptions = {},
): void {
  if (!isLoggingEnabled("error")) return;

  console.error(`[ERROR]${options.source ? ` [${options.source}]` : ""} ${message}`);

  if (err) {
    console.error(err);
  }

  // Always send errors to Sentry
  if (err instanceof Error) {
    Sentry.captureException(err, {
      extra: {
        message,
        source: options.source,
        ...options.meta,
      },
    });
  } else {
    Sentry.captureMessage(message, {
      level: "error",
      extra: {
        error: err,
        source: options.source,
        ...options.meta,
      },
    });
  }
}

/**
 * Log debug message (only in development)
 */
export function debug(message: string, options: LogOptions = {}): void {
  if (!isDevelopment) return;

  console.debug(`[DEBUG]${options.source ? ` [${options.source}]` : ""} ${message}`);

  if (options.meta) {
    console.debug(options.meta);
  }
}

/**
 * Export as default object
 */
export const logger = {
  info,
  warn,
  error,
  debug,
};

export default logger;
