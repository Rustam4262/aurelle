import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, userProfiles } from "@shared/schema";

/**
 * bookings.clientId historically holds either users.id (two creation paths)
 * or user_profiles.id (owner manual-create). Anything that needs the real
 * users.id — notifications, reminders, emails — must resolve through this,
 * not assume the column is already a users.id.
 */
export async function resolveClientUserId(clientId: string): Promise<string | null> {
  const [asUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, clientId))
    .limit(1);
  if (asUser) return asUser.id;

  const [asProfile] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.id, clientId))
    .limit(1);
  return asProfile?.userId ?? null;
}
