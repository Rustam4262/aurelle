import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for error monitoring and tracking
 *
 * This module sets up:
 * - Error tracking
 * - Performance monitoring
 * - Session replay
 * - User feedback
 * - Release tracking
 * - Source maps for readable stack traces
 */

export function initializeSentry() {
  // Only initialize if DSN is provided
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn("Sentry DSN not configured. Error monitoring disabled.");
    return;
  }

  Sentry.init({
    // Data Source Name (DSN) from Sentry project settings
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Environment (production, staging, development)
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || "development",

    // Release version for tracking.
    // Must match the release name used by sentryVitePlugin in vite.config.ts so that
    // uploaded source maps are found for events from this SDK.
    // Priority: VITE_SENTRY_RELEASE (CI) → aurelle@<git-sha> (baked at build time)
    release: import.meta.env.VITE_SENTRY_RELEASE || `aurelle@${__APP_VERSION__}`,

    // Integrations
    integrations: [
      // Browser Tracing for performance monitoring
      Sentry.browserTracingIntegration(),

      // Session Replay - records user sessions for debugging
      Sentry.replayIntegration({
        // Mask all text and input content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),

      // User Feedback - allows users to submit feedback on errors
      Sentry.feedbackIntegration({
        colorScheme: "system",
        autoInject: false, // Manually trigger when needed
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0, // 20% in production, 100% in development

    // Sample rate for profiling
    profilesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Before sending events, filter and modify them
    beforeSend(event, _hint) {
      // Don't send errors in development unless explicitly enabled
      if (!import.meta.env.PROD && !import.meta.env.VITE_SENTRY_FORCE_ENABLE) {
        return null;
      }

      // Filter out network errors (they're noisy)
      if (event.exception?.values?.[0]?.type === "NetworkError") {
        return null;
      }

      // Add custom context
      if (event.exception) {
        event.extra = {
          ...event.extra,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        };
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",
      // Random plugins/extensions
      "atomicFindClose",
      // Network errors that we can't control
      "NetworkError",
      "Network request failed",
      // ResizeObserver loop limit exceeded (benign)
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],

    // Deny URLs (don't capture errors from these scripts)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      // Analytics scripts
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],
  });

  // Set initial context — commit SHA baked at build time
  Sentry.setContext("app", {
    name: "AURELLE Beauty Salon Platform",
    version: __APP_VERSION__,
    environment: import.meta.env.MODE,
  });
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
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
 * Set user context
 */
export function setUser(
  user: { id: string; email?: string; username?: string; role?: string } | null,
) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
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
 * Create a Sentry Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Show user feedback dialog
 */
export function showFeedbackDialog() {
  const feedback = Sentry.getFeedback();
  if (feedback) {
    feedback.createWidget();
  }
}

/**
 * Get current Sentry instance
 */
export { Sentry };
