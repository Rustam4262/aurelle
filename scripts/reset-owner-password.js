/**
 * Script to reset owner password
 * Usage: node scripts/reset-owner-password.js <email> <new-password>
 */

import { db } from "../server/db/index.js";
import { users } from "../server/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-owner-password.js <email> <new-password>");
  console.error(
    "Example: node scripts/reset-owner-password.js xulkarraziyeva@gmail.com aurelle2026",
  );
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log(`Resetting password for: ${email}`);

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`User found: ${user.email} (ID: ${user.id})`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`Password hashed successfully`);

    // Update password
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));

    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    console.log(`\nYou can now login at https://aurelle.uz/auth`);

    process.exit(0);
  } catch (error) {
    console.error("Error resetting password:", error);
    process.exit(1);
  }
}

resetPassword();
