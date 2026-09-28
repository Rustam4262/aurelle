import { eq } from "drizzle-orm";
import { db } from "../db";
import { userProfiles, users } from "@shared/schema";
import { syncUserProfileRole } from "./user-role";

interface EnsureUserProfileOptions {
  userId: string;
  role?: string;
  fullName?: string | null;
  phone?: string | null;
}

export async function ensureUserProfile({
  userId,
  role = "client",
  fullName = null,
  phone = null,
}: EnsureUserProfileOptions) {
  const [existingProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existingProfile) {
    await syncUserProfileRole(userId);
    const [syncedProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return syncedProfile ?? existingProfile;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const derivedFullName =
    fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || null;

  const [createdProfile] = await db
    .insert(userProfiles)
    .values({
      userId,
      role,
      fullName: derivedFullName,
      phone: phone || user?.phoneNumber || null,
      isProfileComplete: false,
    })
    .returning();

  await syncUserProfileRole(userId);
  const [syncedProfile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return syncedProfile ?? createdProfile;
}
