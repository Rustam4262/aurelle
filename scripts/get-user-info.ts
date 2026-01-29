import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, like } from "drizzle-orm";

/**
 * Script to get user information
 * Usage: tsx scripts/get-user-info.ts <email-or-pattern>
 */

async function getUserInfo(emailPattern: string) {
  try {
    console.log(`🔍 Searching for users matching: ${emailPattern}\n`);

    // Search for users
    const foundUsers = await db
      .select()
      .from(users)
      .where(like(users.email, `%${emailPattern}%`))
      .limit(20);

    if (foundUsers.length === 0) {
      console.error(`❌ No users found matching: ${emailPattern}`);
      process.exit(1);
    }

    console.log(`✅ Found ${foundUsers.length} user(s):\n`);

    foundUsers.forEach((user, index) => {
      console.log(`${index + 1}. User Information:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   👤 Name: ${user.firstName || "N/A"} ${user.lastName || "N/A"}`);
      console.log(`   📞 Phone: ${user.phone || "N/A"}`);
      console.log(`   🏙️  City: ${user.city || "N/A"}`);
      console.log(`   👔 Role: ${user.role || "N/A"}`);
      console.log(
        `   🔐 Has Password: ${user.passwordHash ? "Yes (local auth)" : "No (OAuth only)"}`,
      );
      console.log(`   📅 Created: ${user.createdAt}`);
      console.log(`   🔄 Updated: ${user.updatedAt}`);
      console.log("");
    });

    console.log(`\n⚠️  NOTE: Passwords are hashed and cannot be retrieved`);
    console.log(
      `To reset a password, use: tsx scripts/reset-user-password.ts <email> <new-password>`,
    );

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error fetching user info:`, error);
    process.exit(1);
  }
}

// Get argument from command line
const emailPattern = process.argv[2];

if (!emailPattern) {
  console.error(`
Usage: tsx scripts/get-user-info.ts <email-or-pattern>

Examples:
  tsx scripts/get-user-info.ts user@example.com        # Exact or partial match
  tsx scripts/get-user-info.ts gmail.com               # All Gmail users
  tsx scripts/get-user-info.ts xulkar                  # Users with "xulkar" in email

Arguments:
  email-or-pattern  - Email address or search pattern
  `);
  process.exit(1);
}

getUserInfo(emailPattern);
