import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function applyVerificationFields() {
  console.log("🔧 Applying verification fields to users table...");

  try {
    // Add email_verified field
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);
    console.log("✅ email_verified field added");

    // Add phone_verified field
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false
    `);
    console.log("✅ phone_verified field added");

    // Verify fields were added
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('email_verified', 'phone_verified')
    `);

    console.log("\n📊 Verification:");
    console.log(result.rows);

    if (result.rows.length === 2) {
      console.log("\n🎉 SUCCESS! Both fields added successfully!");
      console.log("\n📝 Next steps:");
      console.log("1. Restart your dev server");
      console.log("2. Refresh /admin/users page");
      console.log("3. Users should now appear!");
    } else {
      console.log("\n⚠️  WARNING: Expected 2 fields, found", result.rows.length);
    }

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.log("\n💡 Manual fix: Execute this SQL in Neon Console:");
    console.log("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;");
    console.log("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;");
    process.exit(1);
  }
}

applyVerificationFields();
