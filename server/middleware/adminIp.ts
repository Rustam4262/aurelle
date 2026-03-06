/**
 * server/middleware/adminIp.ts
 *
 * Restricts access to /api/admin/* to a whitelist of IP addresses.
 *
 * Config (in .env):
 *   ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8,::1
 *
 * If ADMIN_ALLOWED_IPS is empty or not set → restriction is DISABLED (all IPs allowed).
 * This lets the feature be toggled without a code deploy.
 *
 * Blocked attempts are logged to audit_logs for visibility.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { db } from "../db";
import { auditLogs } from "@shared/admin-schema";

let _allowedIps: Set<string> | null = null;

/** Parse ADMIN_ALLOWED_IPS at most once per process. */
function getAllowedIps(): Set<string> | null {
  if (_allowedIps !== null) return _allowedIps;

  const raw = process.env.ADMIN_ALLOWED_IPS ?? "";
  const ips = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  _allowedIps = ips.length > 0 ? new Set(ips) : new Set<string>();
  return _allowedIps;
}

/** Extract the real client IP, accounting for proxies (X-Forwarded-For). */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? req.ip ?? "unknown";
}

/**
 * Middleware: block requests to /api/admin/* from non-whitelisted IPs.
 * Mount BEFORE requireAdmin so we never even touch the DB for blocked IPs.
 */
export async function requireAdminIp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const allowed = getAllowedIps();

  // Feature disabled — no IPs configured
  if (!allowed || allowed.size === 0) {
    next();
    return;
  }

  const clientIp = getClientIp(req);

  if (allowed.has(clientIp)) {
    next();
    return;
  }

  // Log the blocked attempt
  logger.warn("Admin IP blocked", {
    source: "adminIp",
    meta: { ip: clientIp, method: req.method, path: req.path },
  });

  // Write to audit_logs (fire-and-forget — don't delay the 403 response)
  void db
    .insert(auditLogs)
    .values({
      actorUserId: "anonymous",
      action: "admin_ip_blocked",
      entityType: "ip_restriction",
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] ?? null,
      result: "blocked",
      details: { method: req.method, path: req.path, ip: clientIp },
    })
    .catch((err: unknown) => {
      logger.error(
        "Failed to write IP-block audit log",
        err instanceof Error ? err : new Error(String(err)),
        { source: "adminIp" },
      );
    });

  res.status(403).json({ error: "Access denied" });
}
