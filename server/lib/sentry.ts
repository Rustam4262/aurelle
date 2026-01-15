import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * Initialize Sentry for backend error monitoring
 *
 * This module sets up:
 * - Error tracking
 * - Performance monitoring
 * - Request tracing
 * - Database query tracking
 * - User context tracking
 * - Release tracking
 */

export function initializeSentry() {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.warn("Sentry DSN not configured. Backend error monitoring disabled.");
    return;
  }

  Sentry.init({
    // Data Source Name (DSN) from Sentry project settings
    dsn: process.env.SENTRY_DSN,

    // Environment (production, staging, development)
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",

    // Release version for tracking
    release: process.env.SENTRY_RELEASE || `aurelle-backend@${process.env.APP_VERSION || "1.0.0"}`,

    // Integrations
    integrations: [
      // Node.js profiling
      nodeProfilingIntegration(),

      // PostgreSQL integration (if needed)
      // Sentry.postgresIntegration(),
    ],

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0, // 20% in production, 100% in development

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Before sending events, filter and modify them
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (process.env.NODE_ENV !== "production" && !process.env.SENTRY_FORCE_ENABLE) {
        return null;
      }

      // Add server context
      if (event.exception) {
        event.extra = {
          ...event.extra,
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
        };
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Expected validation errors
      "ValidationError",
      "Bad Request",
      "Unauthorized",
      "Forbidden",
      // Rate limiting
      "Too Many Requests",
      // Network timeouts (client disconnected)
      "ECONNRESET",
      "EPIPE",
    ],
  });

  // Set initial context
  Sentry.setContext("app", {
    name: "AURELLE Beauty Salon Platform - Backend",
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  });

  console.log("✅ Sentry initialized for backend error monitoring");
}

/**
 * Setup Sentry middleware for Express
 */
export function setupSentryMiddleware(app: Express) {
  // Only setup middleware if Sentry is initialized
  if (!process.env.SENTRY_DSN) {
    return;
  }

  // Request handler - must be the first middleware
  app.use(Sentry.Handlers.requestHandler({
    // Include IP address
    ip: true,
    // Include request data
    request: ["method", "url", "headers", "query_string", "data"],
    // Include user data from session
    user: ["id", "email", "username"],
  }));

  // Tracing handler - tracks performance
  app.use(Sentry.Handlers.tracingHandler());

  console.log("✅ Sentry middleware configured");
}

/**
 * Setup Sentry error handler for Express
 * Must be called AFTER all routes and BEFORE other error handlers
 */
export function setupSentryErrorHandler(app: Express) {
  // Only setup error handler if Sentry is initialized
  if (!process.env.SENTRY_DSN) {
    return;
  }

  // Error handler - must be before any other error middleware
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      // Skip client errors (4xx)
      const statusCode = (error as any).status || (error as any).statusCode || 500;
      return statusCode >= 500;
    },
  }));

  console.log("✅ Sentry error handler configured");
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext("error_context", context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context from request
 */
export function setUserFromRequest(req: Request) {
  const user = (req as any).user;
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username || user.name,
      ip_address: req.ip,
    });
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || "custom",
    level: breadcrumb.level || "info",
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Custom middleware to track user context on each request
 */
export function trackUserMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if ((req as any).user) {
      setUserFromRequest(req);
    }
    next();
  };
}

/**
 * Get current Sentry instance
 */
export { Sentry };
