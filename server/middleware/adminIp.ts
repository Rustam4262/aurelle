/**
 * server/middleware/adminIp.ts
 *
 * Restricts access to /api/admin/* to a whitelist of IP addresses.
 *
 * Config (in .env):
 *   ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8,::1
 *
 * ADMIN_IP_RESTRICTION=false explicitly disables the IP gate.
 * When enabled, missing/invalid configuration fails closed.
 *
 * Blocked attempts are logged to audit_logs for visibility.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { db } from "../db";
import { auditLogs } from "@shared/admin-schema";
import { getClientIp } from "../lib/request-ip";
import { adminIpPolicy } from "../lib/admin-ip-policy";

/**
 * Middleware: block requests to /api/admin/* from non-whitelisted IPs.
 * Mount BEFORE requireAdmin so we never even touch the DB for blocked IPs.
 */
export async function requireAdminIp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const policy = adminIpPolicy(process.env);

  if (!policy.valid) {
    res.status(503).json({ error: "Admin access configuration unavailable" });
    return;
  }
  if (!policy.enabled) {
    next();
    return;
  }

  const clientIp = getClientIp(req) ?? "unknown";

  if (policy.allowed.has(clientIp)) {
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
