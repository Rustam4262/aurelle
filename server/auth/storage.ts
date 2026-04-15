import { db } from "../db";
import { users, userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isSoftDeletedUser } from "../lib/user-deletion";

export const authStorage = {
  async upsertUser(userData: {
    id: string;
    email: string | null;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<{ userId: string }> {
    // 1. Check by provider ID (existing account with this provider)
    const existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);

    if (existingUser.length > 0) {
      if (isSoftDeletedUser(existingUser[0])) {
        throw new Error("ACCOUNT_DELETED");
      }
      await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
        })
        .where(eq(users.id, userData.id));
      return { userId: userData.id };
    }

    // 2. Email linking: if the same email exists on another account, link to it
    if (userData.email) {
      const emailMatch = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (emailMatch.length > 0) {
        if (isSoftDeletedUser(emailMatch[0])) {
          throw new Error("ACCOUNT_DELETED");
        }
        // Update profile image on the existing account and reuse their ID
        await db
          .update(users)
          .set({ profileImageUrl: userData.profileImageUrl || null })
          .where(eq(users.id, emailMatch[0].id));
        return { userId: emailMatch[0].id };
      }
    }

    // 3. Create new user
    await db.insert(users).values({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
    });

    // Create profile for new user
    const existingProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userData.id))
      .limit(1);

    if (existingProfile.length === 0) {
      await db.insert(userProfiles).values({
        userId: userData.id,
        fullName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || null,
        role: "client",
        isProfileComplete: false,
      });
    }

    return { userId: userData.id };
  },
};
