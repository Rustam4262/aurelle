/**
 * Generate bcrypt hash for password
 * Run with: node scripts/generate-password-hash.js
 */

const bcrypt = require("bcrypt");

const password = "password123";
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Error generating hash:", err);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("PASSWORD HASH GENERATED");
  console.log("========================================\n");
  console.log("Password:", password);
  console.log("Hash:", hash);
  console.log("\nUse this hash in create-test-users.sql");
  console.log("Replace all instances of the placeholder hash with:");
  console.log(hash);
  console.log("\n========================================\n");
});
