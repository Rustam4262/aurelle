import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Quick script to check if Phase 11 tables exist
 */

async function checkTables() {
  try {
    console.log("🔍 Checking database tables...\n");

    // Check for salon_managers table
    const salonManagersCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'salon_managers'
      );
    `);

    const salonManagersExists = salonManagersCheck.rows[0]?.exists;
    console.log(`✓ salon_managers table: ${salonManagersExists ? "✅ EXISTS" : "❌ NOT FOUND"}`);

    if (salonManagersExists) {
      // Count managers
      const countResult = await db.execute(sql`SELECT COUNT(*) FROM salon_managers`);
      const count = countResult.rows[0]?.count || 0;
      console.log(`  └─ Manager count: ${count}\n`);
    }

    // Check for salon_breaks table
    const salonBreaksCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'salon_breaks'
      );
    `);

    const salonBreaksExists = salonBreaksCheck.rows[0]?.exists;
    console.log(`✓ salon_breaks table: ${salonBreaksExists ? "✅ EXISTS" : "❌ NOT FOUND"}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking tables:", error);
    process.exit(1);
  }
}

checkTables();
