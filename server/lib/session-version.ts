import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { logger } from "./logger";
import { SESSION_COOKIE_NAME } from "./session-cookie";

export function matchesAuthVersion(sessionVersion: unknown, accountVersion: number): boolean {
  return (sessionVersion ?? 0) === accountVersion;
}

// Applied after express-session and before every authentication/API route.
// Database-backed revocation works with either Redis or PostgreSQL sessions.
export const enforceSessionVersion: RequestHandler = async (req, res, next) => {
  const identity = req.session?.passport?.user;
  if (!identity) return next();
  try {
    const id = identity.claims?.sub;
    const [account] = id
      ? await db
          .select({
            authVersion: users.authVersion,
            isBlocked: users.isBlocked,
          })
          .from(users)
          .where(eq(users.id, id))
          .limit(1)
      : [];
    if (
      !account ||
      account.isBlocked ||
      !matchesAuthVersion((identity as any).authVersion, account.authVersion)
    ) {
      return req.session.destroy((error) => {
        if (error)
          return res.status(503).json({ message: "Authentication temporarily unavailable" });
        res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
        res.status(401).json({ message: "Session expired. Please sign in again." });
      });
    }
    next();
  } catch (error) {
    logger.error("Session revocation check failed", error as Error, { source: "auth" });
    res.status(503).json({ message: "Authentication temporarily unavailable" });
  }
};
