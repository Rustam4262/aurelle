import { and, eq } from "drizzle-orm";
import { adminRoles, adminUsers } from "@shared/admin-schema";
import { salons, users } from "@shared/schema";
import { db } from "../db";
import type { RoomAccess } from "./ws-room-policy";

export const roomAccess: RoomAccess = {
  async isActiveUser(userId) {
    const [user] = await db
      .select({ blocked: users.isBlocked })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return !!user && user.blocked !== true;
  },
  async isSuperAdmin(userId) {
    const [admin] = await db
      .select({ permissions: adminRoles.permissions })
      .from(adminUsers)
      .innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
      .where(
        and(
          eq(adminUsers.userId, userId),
          eq(adminUsers.isActive, true),
          eq(adminRoles.isActive, true),
        ),
      )
      .limit(1);
    return Array.isArray(admin?.permissions) && admin.permissions.includes("*");
  },
  async ownsSalon(userId, salonId) {
    const [salon] = await db
      .select({ id: salons.id })
      .from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.ownerId, userId)))
      .limit(1);
    return !!salon;
  },
};
