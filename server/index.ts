import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializeUploadDirectories } from "./initUploads";
import { initializeEmail } from "./email";
import { startSanctionExpiryJob } from "./jobs/expire-sanctions";
import {
  initializeSentry,
  setupSentryMiddleware,
  setupSentryErrorHandler,
  trackUserMiddleware,
} from "./lib/sentry";
import { trackActivityHeartbeat } from "./middleware/activity";

// Initialize Sentry as early as possible
initializeSentry();

const app = express();
const httpServer = createServer(app);

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
            ? ["'unsafe-inline'", "'unsafe-eval'"]
            : []),
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
        ],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": [
          "'self'",
          "https://api-maps.yandex.ru",
          "https://*.sentry.io",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
          "wss:",
        ],
        "frame-src": ["https://www.googletagmanager.com"],
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
      "http://localhost:5000",
      "https://aurelle.uz",
      "http://localhost", // Capacitor Android
      "capacitor://localhost", // Capacitor iOS
    ],
    credentials: true,
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

import { logger } from "./lib/logger";

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      logger.info(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize upload directories
  initializeUploadDirectories();

  // Initialize email system
  initializeEmail();

  await registerRoutes(httpServer, app);

  // Track user context after authentication
  app.use(trackUserMiddleware());

  // Track user activity heartbeat for authenticated users
  app.use(trackActivityHeartbeat());

  // Sentry error handler - must be before other error handlers
  setupSentryErrorHandler(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });

    // Only throw server errors (5xx) - Sentry will capture them
    if (status >= 500) {
      throw err;
    }
  });

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: process.platform === "win32" ? "127.0.0.1" : "0.0.0.0",
      reusePort: process.platform !== "win32",
    },
    () => {
      logger.info(`serving on port ${port}`);

      // Start cron jobs
      startSanctionExpiryJob();
    },
  );
})();
