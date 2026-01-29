import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log("🚀 Starting admin panel migrations...\n");

    const migrationsDir = path.join(__dirname, "../migrations");
    const migrationFiles = [
      "0012_create_admin_rbac.sql",
      "0013_create_sanctions.sql",
      "0014_create_complaints.sql",
      "0015_create_audit_logs.sql",
      "0016_create_admin_chat.sql",
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} - file not found`);
        continue;
      }

      console.log(`📝 Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(filePath, "utf-8");

      // Split by semicolons but keep statements together
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        try {
          await db.execute(sql.raw(statement + ";"));
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes("already exists")) {
            console.log(`   ℹ️  Skipped - already exists`);
          } else {
            throw error;
          }
        }
      }

      console.log(`✅ Completed: ${file}\n`);
    }

    console.log("✨ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
