/**
 * server/middleware/csrf.ts
 *
 * CSRF protection via Double Submit Cookie pattern.
 *
 * How it works:
 *   1. `setCsrfCookie` — sets a `csrf-token` cookie (NOT HttpOnly) on every response
 *      so the browser JS can read it.
 *   2. `verifyCsrf` — on every unsafe method (POST/PUT/PATCH/DELETE), reads the
 *      `X-CSRF-Token` request header and compares it to the `csrf-token` cookie.
 *      Mismatch → 403.
 *
 * Client responsibility:
 *   Read `document.cookie` for `csrf-token` and attach it as `X-CSRF-Token` header
 *   on all mutating apiRequest() calls. (See client/src/lib/queryClient.ts)
 *
 * Applied to:
 *   /api/admin/*    /api/bookings/*    /api/salons/*    /api/owner/*
 *
 * Excluded:
 *   /api/auth/*     (login / OAuth / password reset don't have the cookie yet)
 *   GET / HEAD / OPTIONS  (safe methods, no state change)
 */

import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { logger } from "../lib/logger";

const COOKIE_NAME = "csrf-token";
const HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32; // bytes → 64 hex chars
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Parse a single cookie value from a `Cookie:` header string. */
function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return undefined;
}

/** Generate a new CSRF token and set the cookie. Returns the token value. */
function generateToken(res: Response): string {
  const token = randomBytes(TOKEN_LENGTH).toString("hex");
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,          // JS must read it — intentionally NOT httpOnly
    sameSite: "strict",
    secure: isProduction,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours — refresh on next page load
  });

  return token;
}

/**
 * Middleware: Set (or refresh) the csrf-token cookie on every response.
 * Mount globally before route handlers.
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  const existing = parseCookie(req.headers.cookie, COOKIE_NAME);
  if (!existing) {
    generateToken(res);
  }
  next();
}

/**
 * Middleware: Verify that X-CSRF-Token header matches the csrf-token cookie.
 * Apply to route groups that require CSRF protection (admin, bookings, salons, owner).
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  // Safe methods are exempt
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = parseCookie(req.headers.cookie, COOKIE_NAME);
  const headerToken = req.headers[HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn("CSRF validation failed", {
      source: "csrf",
      meta: {
        method: req.method,
        path: req.path,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        ip: req.ip,
      },
    });
    res.status(403).json({ error: "CSRF token mismatch" });
    return;
  }

  next();
}
