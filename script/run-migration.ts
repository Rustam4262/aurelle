import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  try {
    console.log("Running migration: 0017_create_user_activity_tracking.sql");

    const migrationPath = join(process.cwd(), "migrations", "0017_create_user_activity_tracking.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.toLowerCase().includes("commit")) {
        console.log("Skipping COMMIT statement");
        continue;
      }

      try {
        await db.execute(sql.raw(statement));
        console.log("✓ Executed:", statement.substring(0, 60) + "...");
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes("already exists")) {
          console.log("⚠ Skipped (already exists):", statement.substring(0, 60) + "...");
        } else {
          console.error("✗ Error:", error.message);
          console.error("Statement:", statement);
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
