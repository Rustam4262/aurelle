#!/usr/bin/env tsx
/**
 * scripts/db-push-safe.ts
 *
 * Safe wrapper around `drizzle-kit push`.
 *   - Blocks execution in NODE_ENV=production.
 *   - In dev/staging: runs `drizzle-kit push --force` (non-interactive).
 *
 * Usage:
 *   npm run db:push          # blocked if NODE_ENV=production
 *   npm run db:push -- --dry # future: dry-run flag
 */

import "dotenv/config";
import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

if (process.env.NODE_ENV === "production") {
  console.error("");
  console.error("  ❌  db:push is BLOCKED in production.");
  console.error("");
  console.error(
    "  Pushing the Drizzle schema directly to a production database can cause data loss",
  );
  console.error(
    "  or downtime. Apply schema changes via manual SQL migrations instead.",
  );
  console.error("");
  console.error("  Safe procedure:");
  console.error("    1. Write SQL in migrations/NNNN_<description>.sql");
  console.error("    2. Review with a DBA/peer");
  console.error("    3. Apply:  psql $DATABASE_URL -f migrations/NNNN_<description>.sql");
  console.error("    4. Verify: npm run db:verify");
  console.error("");
  console.error("  See docs/DB_MIGRATIONS.md for full details.");
  console.error("");
  process.exit(1);
}

const configPath = path.join(root, "drizzle.config.ts");
const cmd = `npx drizzle-kit push --force --config=${configPath}`;

console.log(`⚙️   Running: ${cmd}`);
execSync(cmd, { stdio: "inherit", cwd: root });
