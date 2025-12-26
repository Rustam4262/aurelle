import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { setupYandexAuth } from "./yandexAuth";
import { setupGoogleAuth } from "./googleAuth";
import { setupGitHubAuth } from "./githubAuth";
import { setupLocalAuth } from "./localAuth";
import { setupPhoneAuth } from "./phoneAuth";
import { registerUploadRoutes } from "./uploadRoutes";
import { globalLimiter } from "./middleware/rateLimiter";
import apiRoutes from "./routes/index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Global rate limiter for all API requests
  app.use("/api", globalLimiter);

  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Setup OAuth providers (if configured)
  await setupYandexAuth(app);
  await setupGoogleAuth(app);
  await setupGitHubAuth(app);

  // Setup local auth (login/password)
  setupLocalAuth(app);

  // Setup phone auth (SMS)
  setupPhoneAuth(app);

  // Setup file upload routes
  registerUploadRoutes(app);

  // Register all modular API routes
  app.use("/api", apiRoutes);

  return httpServer;
}
