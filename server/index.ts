import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/requestErrorHandler";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializeUploadDirectories } from "./initUploads";
import { initializeEmail } from "./email";
import { startSanctionExpiryJob } from "./jobs/expire-sanctions";
import { startBookingRemindersJob } from "./jobs/booking-reminders";
import { startGmvRefreshJob } from "./lib/gmv-refresh";
import { startDraftCleanupJob } from "./jobs/cleanup-drafts";
import { startLifecycleCron } from "./lib/subscriptions";
import { initializeSentry, setupSentryMiddleware, setupSentryErrorHandler } from "./lib/sentry";
import { trackActivityHeartbeat } from "./middleware/activity";
import { setupWebSocket } from "./lib/websocket";
import { setCsrfCookie } from "./middleware/csrf";

// Initialize Sentry as early as possible
initializeSentry();

// A rejection with no .catch() anywhere in the chain must never crash the
// process silently (or inconsistently, depending on Node version defaults) —
// log it so it's visible, the same way a thrown error already is.
process.on("unhandledRejection", (reason) => {
  logger.error(
    "Unhandled promise rejection",
    reason instanceof Error ? reason : new Error(String(reason)),
    {
      source: "process",
    },
  );
});

// An uncaught exception means some code ran past a point it assumed could
// not fail — process state is no longer trustworthy. Log it and exit so PM2
// restarts into a clean process, rather than keep serving from a corrupted one.
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — exiting", err, { source: "process" });
  process.exit(1);
});

const app = express();
const httpServer = createServer(app);
app.use("/api", (_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

import cors from "cors";
import helmet from "helmet";

// Setup Sentry request handler - must be first middleware
setupSentryMiddleware(app);

// Security headers with helmet
// NOTE: mirrors configs/nginx-https.conf CSP (nginx applies it to HTML via try_files,
// helmet applies it only to /api/* via proxy_pass).
// Keep both in sync. Verify with: ./scripts/verify-csp.sh https://aurelle.uz
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        // In development Vite uses inline scripts and new Function() for HMR
        "script-src": [
          "'self'",
          ...(process.env.NODE_ENV !== "production"
            ? ["'unsafe-inline'", "'unsafe-eval'"] // NODE_ENV !== production
            : []),
          "https://api-maps.yandex.ru",
          "https://yastatic.net",
          "https://*.yastatic.net",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://yastatic.net",
          "https://*.yastatic.net",
        ],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "https://*.maps.yandex.net",
          "https://yastatic.net",
          "https://*.yastatic.net",
        ],
        "connect-src": [
          "'self'",
          "https://api-maps.yandex.ru",
          "https://geocode-maps.yandex.ru",
          "https://suggest-maps.yandex.ru",
          "https://*.maps.yandex.net",
          "https://yastatic.net",
          "https://*.yastatic.net",
          "https://*.sentry.io",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
          "wss:",
        ],
        "frame-src": ["https://www.googletagmanager.com"],
        // 'self' for our own /sw.js; blob: for Yandex Maps v3 tile workers
        "worker-src": ["'self'", "blob:"],
      },
    },
    // frame-ancestors 'none' в CSP перекрывает X-Frame-Options, но оставляем для legacy
    frameguard: { action: "deny" },
    crossOriginEmbedderPolicy: false, // Needed for external resources
  }),
);

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite dev server
      "https://aurelle.uz",
      "http://localhost", // Capacitor Android WebView (uses port-80 origin)
      "capacitor://localhost", // Capacitor iOS
    ],
    credentials: true,
  }),
);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

// Set CSRF token cookie on every response (readable by JS, checked on mutations)
app.use(setCsrfCookie);

import { logger } from "./lib/logger";
import { requestId, slowRequestLogger } from "./middleware/requestId";

// Attach x-request-id + timing to every request
app.use(requestId);
app.use(slowRequestLogger);

// Track activity heartbeat for authenticated requests. Registered before
// routes, but hooks res.on("finish") internally so it still sees whatever
// `req.user` the matched route's own isAuthenticated set.
app.use(trackActivityHeartbeat());

(async () => {
  // Initialize upload directories
  initializeUploadDirectories();

  // Initialize email system
  initializeEmail();

  await registerRoutes(httpServer, app);

  // Sentry error handler - must be before other error handlers
  setupSentryErrorHandler(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    logger.info("Serving static files in production mode");
    serveStatic(app);
  } else {
    logger.info(`Initializing Vite in development mode... (REPL_ID: ${process.env.REPL_ID})`);
    logger.info("Importing ./vite...");
    const { setupVite } = await import("./vite");
    logger.info("Imported ./vite successfully. Calling setupVite...");
    await setupVite(httpServer, app);
    logger.info("Vite initialized successfully");
  }

  // Handle errors from API routes and static/Vite middleware alike.
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Setup WebSocket server (must be done before listen so upgrade events work).
  // Now async: sets up Redis pub/sub subscriber before accepting connections.
  await setupWebSocket(httpServer);

  // In PM2 cluster mode each worker gets a NODE_APP_INSTANCE env var (0, 1, 2…).
  // Run cron jobs only on instance 0 to avoid N duplicate executions per interval.
  const isMainInstance = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";

  httpServer.listen(
    {
      port,
      host:
        process.env.NODE_ENV === "production" || process.platform === "win32"
          ? "127.0.0.1"
          : "0.0.0.0",
      reusePort: process.platform !== "win32",
    },
    () => {
      logger.info(`serving on port ${port}`);

      // Start cron jobs — only on the primary cluster worker
      if (isMainInstance) {
        startSanctionExpiryJob();
        startBookingRemindersJob();
        startGmvRefreshJob();
        startDraftCleanupJob();
        startLifecycleCron();
        logger.info("[Cron] Jobs started on instance 0");
      } else {
        logger.info(`[Cron] Jobs skipped (instance ${process.env.NODE_APP_INSTANCE})`);
      }

      // Signal PM2 that the process is ready (required for wait_ready: true)
      if (process.send) {
        process.send("ready");
      }
    },
  );

  // Stop accepting new connections and let in-flight requests finish before
  // the process exits — PM2 sends SIGTERM on reload/restart/stop.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`, { source: "process" });
    httpServer.close(() => {
      logger.info("HTTP server closed", { source: "process" });
      process.exit(0);
    });
    // Don't hang forever if a connection never drains.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})().catch((err) => {
  logger.error("Fatal startup error", err instanceof Error ? err : new Error(String(err)), {
    source: "process",
  });
  process.exit(1);
});
