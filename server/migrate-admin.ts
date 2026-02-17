import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    logger.info("Starting admin panel migrations", { source: "migrate-admin" });

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
        logger.warn(`Skipping ${file} - file not found`, { source: "migrate-admin" });
        continue;
      }

      logger.info(`Running migration: ${file}`, { source: "migrate-admin" });
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
            logger.info("Skipped - already exists", { source: "migrate-admin" });
          } else {
            throw error;
          }
        }
      }

      logger.info(`Completed: ${file}`, { source: "migrate-admin" });
    }

    logger.info("All migrations completed successfully", { source: "migrate-admin" });
    process.exit(0);
  } catch (error) {
    logger.error("Migration failed", error as Error, { source: "migrate-admin" });
    process.exit(1);
  }
}

runMigrations();
