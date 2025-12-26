import { db } from "../db";
import { users, userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

export const authStorage = {
  async upsertUser(userData: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }) {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
        })
        .where(eq(users.id, userData.id));
    } else {
      // Create new user
      await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
      });
    }

    // Check and create/update user profile
    const existingProfile = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userData.id)).limit(1);

    if (existingProfile.length === 0) {
      // Create profile for new user
      await db.insert(userProfiles).values({
        userId: userData.id,
        fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || null,
        role: "client", // Default role
        isProfileComplete: false,
      });
    }
  },
};
