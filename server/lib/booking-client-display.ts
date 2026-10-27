import { eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { users, userProfiles } from "@shared/schema";

export async function loadBookingClientDisplays(clientIds: string[]) {
  const result = new Map<string, { fullName: string | null; avatarUrl: string | null }>();
  if (!clientIds.length) return result;
  const clients = await db.select({
    userId: users.id,
    profileId: userProfiles.id,
    fullName: userProfiles.fullName,
    avatarUrl: userProfiles.avatarUrl,
    firstName: users.firstName,
    lastName: users.lastName,
    profileImageUrl: users.profileImageUrl,
    email: users.email,
  }).from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(or(inArray(users.id, clientIds), inArray(userProfiles.id, clientIds)));
  const displays = clients.map(client => ({
    userId: client.userId, profileId: client.profileId,
    display: {
      fullName: client.fullName?.trim() ||
        [client.firstName?.trim(), client.lastName?.trim()].filter(Boolean).join(" ") ||
        client.email?.split("@")[0] || null,
      avatarUrl: client.avatarUrl || client.profileImageUrl || null,
    },
  }));
  // Legacy bookings used profile IDs. Canonical account IDs take precedence
  // if an imported profile ID collides with another account's ID.
  for (const client of displays) if (client.profileId) result.set(client.profileId, client.display);
  for (const client of displays) result.set(client.userId, client.display);
  return result;
}
