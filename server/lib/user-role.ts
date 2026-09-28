import { adminUsers } from "@shared/admin-schema";
import { masters, salons, userProfiles } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

export type DerivedUserRole = "admin" | "owner" | "solo_master" | "master" | "client";

export async function deriveUserRole(userId: string): Promise<DerivedUserRole> {
  try {
    const [admin] = await db
      .select({ userId: adminUsers.userId })
      .from(adminUsers)
      .where(and(eq(adminUsers.userId, userId), eq(adminUsers.isActive, true)))
      .limit(1);

    if (admin) {
      return "admin";
    }
  } catch {
    // Admin tables may be unavailable in some environments.
  }

  const [ownerSalon] = await db
    .select({ id: salons.id })
    .from(salons)
    .where(eq(salons.ownerId, userId))
    .limit(1);

  if (ownerSalon) {
    return "owner";
  }

  const [master] = await db
    .select({ isSoloMaster: masters.isSoloMaster })
    .from(masters)
    .where(eq(masters.userId, userId))
    .limit(1);

  if (master) {
    return master.isSoloMaster ? "solo_master" : "master";
  }

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return (profile?.role as DerivedUserRole | undefined) || "client";
}

export async function syncUserProfileRole(userId: string): Promise<void> {
  const derivedRole = await deriveUserRole(userId);
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile || profile.role === derivedRole) {
    return;
  }

  await db
    .update(userProfiles)
    .set({
      role: derivedRole,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));
}
