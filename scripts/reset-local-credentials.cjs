const bcrypt = require("bcrypt");
const { Client } = require("pg");

const USERS = [
  { email: "admin@aurelle.local", password: "Admin123!" },
  { email: "owner@aurelle.local", password: "Owner123!" },
  { email: "master@aurelle.local", password: "Master123!" },
  { email: "client@aurelle.local", password: "Client123!" },
];

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5433/aurelle",
  });

  await client.connect();

  try {
    for (const user of USERS) {
      const hash = await bcrypt.hash(user.password, 12);
      await client.query(
        `
          UPDATE users
          SET password_hash = $1,
              is_blocked = false,
              updated_at = NOW()
          WHERE email = $2
        `,
        [hash, user.email],
      );
      console.log(`updated ${user.email}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
