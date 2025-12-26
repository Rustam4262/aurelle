import type { Express, RequestHandler } from "express";

// Simple authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via session
  if (req.session && (req.session as any).passport?.user) {
    const user = (req.session as any).passport.user;

    // Attach user to request
    (req as any).user = user;

    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};

// Placeholder for future auth setup (OAuth, etc.)
export async function setupAuth(app: Express) {
  // Currently using only local auth
  // This function is here for future extensibility
  console.log("Auth system initialized (local auth only)");
}

// Placeholder for auth routes registration
export function registerAuthRoutes(app: Express) {
  // Auth routes are handled by localAuth.ts
  // This function is here for compatibility
}
