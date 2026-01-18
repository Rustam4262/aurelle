import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Script to manually reset a user's password
 * Usage: tsx scripts/reset-user-password.ts <email> <new-password>
 */

const BCRYPT_ROUNDS = 12;

async function resetUserPassword(email: string, newPassword: string) {
  try {
    console.log(`🔍 Searching for user: ${email}`);

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Hash new password
    console.log(`🔐 Hashing new password...`);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    console.log(`💾 Updating password in database...`);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    console.log(`✅ Password successfully reset for ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`\n⚠️  IMPORTANT: User can now login with this password`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error resetting password:`, error);
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error(`
Usage: tsx scripts/reset-user-password.ts <email> <new-password>

Example:
  tsx scripts/reset-user-password.ts user@example.com NewPassword123

Arguments:
  email        - User's email address
  newPassword  - New password (minimum 8 characters)
  `);
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error(`❌ Password must be at least 8 characters long`);
  process.exit(1);
}

resetUserPassword(email, newPassword);
