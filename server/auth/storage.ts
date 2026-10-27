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
    emailVerified?: boolean;
    oauthProvider?: "google" | "yandex";
    allowEmailLink?: boolean;
    registrationRole?: "client" | "owner" | "solo_master";
  }): Promise<{ userId: string; isNew?: boolean }> {
    // 1. Check by provider ID (existing account with this provider)
    const existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);

    if (existingUser.length > 0) {
      if (isSoftDeletedUser(existingUser[0])) {
        throw new Error("ACCOUNT_DELETED");
      }
      if (existingUser[0].isBlocked) throw new Error("ACCOUNT_BLOCKED");
      await db
        .update(users)
        .set({
          email: userData.email,
          ...(userData.emailVerified ? { emailVerified: true } : {}),
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: existingUser[0].profileImageUrl || userData.profileImageUrl || null,
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
        if (userData.allowEmailLink === false) throw new Error("EMAIL_LINK_REQUIRES_LOGIN");
        if (emailMatch[0].isBlocked) throw new Error("ACCOUNT_BLOCKED");
        // Reuse the existing account without replacing its chosen avatar.
        await db
          .update(users)
          .set({
            profileImageUrl: emailMatch[0].profileImageUrl || userData.profileImageUrl || null,
            ...(userData.emailVerified ? { emailVerified: true } : {}),
          })
          .where(eq(users.id, emailMatch[0].id));
        return { userId: emailMatch[0].id };
      }
    }

    // 3. Create new user
    await db.insert(users).values({
      id: userData.id,
      ...(userData.oauthProvider || userData.emailVerified
        ? {
            emailVerified: userData.emailVerified === true,
            roleSelectionRequired: true,
            provider: userData.oauthProvider || "google",
            providerId: userData.id.slice(userData.id.indexOf(":") + 1),
          }
        : {}),
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
        role:
          userData.oauthProvider || userData.emailVerified
            ? "client"
            : userData.registrationRole || "client",
        isProfileComplete: false,
      });
    }

    return { userId: userData.id, isNew: true };
  },
};
