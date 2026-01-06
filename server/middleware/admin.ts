import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { adminUsers, adminRoles, auditLogs, sanctions } from "@shared/admin-schema";
import { eq, and, or, gte, isNull } from "drizzle-orm";

// Extend Express Request type to include admin info
declare global {
  namespace Express {
    interface Request {
      admin?: {
        roleId: string;
        roleName: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware: Verify user is an active admin
 * Must be used after authentication middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated via session
    const sessionUser = (req.session as any)?.passport?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = sessionUser.claims.sub;

    // Check if user has active admin role
    const adminUser = await db
      .select({
        adminUserId: adminUsers.id,
        roleId: adminUsers.roleId,
        roleName: adminRoles.name,
        roleDisplayName: adminRoles.displayName,
        permissions: adminRoles.permissions,
        adminActive: adminUsers.isActive,
        roleActive: adminRoles.isActive,
      })
      .from(adminUsers)
      .innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
      .where(
        and(
          eq(adminUsers.userId, userId),
          eq(adminUsers.isActive, true),
          eq(adminRoles.isActive, true)
        )
      )
      .limit(1);

    if (!adminUser || adminUser.length === 0) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Attach admin info to request
    req.admin = {
      roleId: adminUser[0].roleId,
      roleName: adminUser[0].roleName,
      permissions: adminUser[0].permissions as string[],
    };

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ error: "Failed to verify admin status" });
  }
}

/**
 * Middleware factory: Check specific permission
 * Usage: requirePermission("users.block")
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { permissions } = req.admin;

    // Super admin has all permissions
    if (permissions.includes("*")) {
      return next();
    }

    // Check specific permission
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: permission,
      });
    }

    next();
  };
}

/**
 * Middleware factory: Check any of multiple permissions
 * Usage: requireAnyPermission(["users.read", "users.write"])
 */
export function requireAnyPermission(perms: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { permissions } = req.admin;

    // Super admin has all permissions
    if (permissions.includes("*")) {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = perms.some((p) => permissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: perms,
      });
    }

    next();
  };
}

/**
 * Helper function to log admin actions
 */
export async function logAuditAction(data: {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  meta?: any;
  req?: Request;
}) {
  try {
    const { req, ...auditData } = data;

    await db.insert(auditLogs).values({
      ...auditData,
      ip: req?.ip || undefined,
      userAgent: req?.get("user-agent") || undefined,
      requestId: req?.get("x-request-id") || undefined,
      oldData: auditData.oldData || undefined,
      newData: auditData.newData || undefined,
      meta: auditData.meta || undefined,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Middleware: Check if user/salon/master is sanctioned
 * Blocks requests if active sanction exists
 */
export async function checkSanctions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated via session
    const sessionUser = (req.session as any)?.passport?.user;
    if (!sessionUser) {
      return next();
    }

    const userId = sessionUser.claims.sub;
    const now = new Date();

    // Check for active sanctions on this user
    const activeSanctions = await db
      .select()
      .from(sanctions)
      .where(
        and(
          eq(sanctions.targetType, "user"),
          eq(sanctions.targetId, userId),
          eq(sanctions.status, "active"),
          or(
            // Permanent block
            and(
              eq(sanctions.sanctionType, "perm_block"),
              isNull(sanctions.endsAt)
            ),
            // Temporary block not yet expired
            and(
              eq(sanctions.sanctionType, "temp_block"),
              gte(sanctions.endsAt, now)
            )
          )
        )
      )
      .limit(1);

    if (activeSanctions.length > 0) {
      const sanction = activeSanctions[0];

      return res.status(403).json({
        error: "Account sanctioned",
        sanction: {
          type: sanction.sanctionType,
          reason: sanction.commentToUser || sanction.reasonText,
          endsAt: sanction.endsAt,
        },
      });
    }

    next();
  } catch (error) {
    console.error("Sanction check error:", error);
    // Don't block on error - fail open for regular users
    next();
  }
}

/**
 * Helper: Check if specific feature is restricted
 */
export async function checkFeatureRestriction(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const now = new Date();

    const restrictedSanctions = await db
      .select()
      .from(sanctions)
      .where(
        and(
          eq(sanctions.targetType, "user"),
          eq(sanctions.targetId, userId),
          eq(sanctions.status, "active"),
          eq(sanctions.sanctionType, "feature_restrict"),
          or(isNull(sanctions.endsAt), gte(sanctions.endsAt, now))
        )
      );

    // Check if any sanction restricts this feature
    for (const sanction of restrictedSanctions) {
      const features = sanction.features as Record<string, boolean> | null;
      if (features && features[feature] === false) {
        return true; // Feature is restricted
      }
    }

    return false; // Feature is allowed
  } catch (error) {
    console.error("Feature restriction check error:", error);
    return false; // Fail open - don't block on error
  }
}
