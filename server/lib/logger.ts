import * as Sentry from "@sentry/node";

/**
 * Unified logging utility for server-side
 * Integrates with Sentry for production error tracking
 * Provides structured logging with timestamps and sources
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  source?: string;
  meta?: Record<string, any>;
}

const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Format timestamp for log messages
 */
function getTimestamp(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Format log message with timestamp and source
 */
function formatMessage(
  level: LogLevel,
  message: string,
  source?: string,
): string {
  const timestamp = getTimestamp();
  const sourceTag = source ? `[${source}]` : "[server]";
  const levelTag = level.toUpperCase().padEnd(5);
  return `${timestamp} ${levelTag} ${sourceTag} ${message}`;
}

/**
 * Log info message
 */
export function info(message: string, options: LogOptions = {}): void {
  const formatted = formatMessage("info", message, options.source);
  console.log(formatted);

  // Send to Sentry as breadcrumb in production
  if (isProduction && options.meta) {
    Sentry.addBreadcrumb({
      message,
      level: "info",
      data: options.meta,
    });
  }
}

/**
 * Log warning message
 */
export function warn(message: string, options: LogOptions = {}): void {
  const formatted = formatMessage("warn", message, options.source);
  console.warn(formatted);

  // Send to Sentry in production
  if (isProduction) {
    if (options.meta) {
      Sentry.setContext("warning_context", options.meta);
    }
    Sentry.captureMessage(message, "warning");
  }
}

/**
 * Log error message and optionally capture to Sentry
 */
export function error(
  message: string,
  err?: Error | unknown,
  options: LogOptions = {},
): void {
  const formatted = formatMessage("error", message, options.source);
  console.error(formatted);

  if (err) {
    console.error(err);
  }

  // Always send errors to Sentry in production
  if (isProduction || process.env.SENTRY_FORCE_ENABLE === "true") {
    // Set context for additional data
    if (options.source || options.meta) {
      Sentry.setContext("error_context", {
        message,
        source: options.source,
        ...options.meta,
      });
    }

    if (err instanceof Error) {
      Sentry.captureException(err);
    } else if (err) {
      Sentry.captureMessage(message, "error");
    } else {
      Sentry.captureMessage(message, "error");
    }
  }
}

/**
 * Log debug message (only in development)
 */
export function debug(message: string, options: LogOptions = {}): void {
  if (!isDevelopment) return;

  const formatted = formatMessage("debug", message, options.source);
  console.debug(formatted);

  if (options.meta) {
    console.debug(options.meta);
  }
}

/**
 * Legacy compatibility: export as default object
 */
export const logger = {
  info,
  warn,
  error,
  debug,
};

/**
 * Backward compatibility with existing log() function
 * @deprecated Use logger.info() instead
 */
export function log(message: string, source = "express"): void {
  info(message, { source });
}
