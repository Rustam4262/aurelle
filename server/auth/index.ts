import type { Express, RequestHandler, Request } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

const PgSession = connectPgSimple(session);

// Extend session to include passport user
declare module "express-session" {
  interface SessionData {
    passport?: {
      user: any;
    };
  }
}

// Simple authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via session
  if (req.session && req.session.passport?.user) {
    const user = req.session.passport.user;

    // Attach user to request
    (req as any).user = user;

    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};

// Setup authentication with session support
export async function setupAuth(app: Express) {
  // Trust proxy - важно для работы за Nginx
  app.set("trust proxy", 1);

  // Configure session
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset cookie maxAge on every request
      cookie: {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax", // Always lax for better compatibility
      },
    }),
  );

  console.log("Auth system initialized (local auth only)");
}

// Placeholder for auth routes registration
export function registerAuthRoutes(app: Express) {
  // Auth routes are handled by localAuth.ts
  // This function is here for compatibility
}
