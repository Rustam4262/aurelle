import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, salons, reviews } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/salons.routes");
for (const [name, table] of [["users", users], ["salons", salons], ["reviews", reviews]] as const) {
  const cols = Object.values(getTableColumns(table)).map(c => `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.join(",")})`);
}
const app = express(); app.use("/salons", routes);
const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
const url = `http://127.0.0.1:${(server.address() as any).port}/salons/stats/public`;
async function stats() {
  const r = await fetch(url); assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(Object.keys(body).sort(), ["averageRating", "citiesCount", "reviewsCount", "salonsCount"]);
  return body;
}
const userIds = [randomUUID(), randomUUID()], salonIds = [randomUUID(), randomUUID(), randomUUID()];
const reviewIds = Array.from({length: 5}, () => randomUUID());
try {
  const before = await stats();
  await pool.query("INSERT INTO users (id,is_blocked) VALUES ($1,false),($2,true)", userIds);
  await pool.query("INSERT INTO salons (id,owner_id,is_active,city) VALUES ($1,$4,true,$6),($2,$4,false,$6),($3,$5,true,$6)", [...salonIds, ...userIds, randomUUID()]);
  for (let i = 0; i < 5; i++) {
    // Only first review belongs to an active public salon and is visible.
    await pool.query("INSERT INTO reviews (id,salon_id,rating,is_hidden) VALUES ($1,$2,$3,$4)",
      [reviewIds[i], i < 2 ? salonIds[0] : i === 2 ? salonIds[1] : i === 3 ? salonIds[2] : null, i === 0 ? 5 : 1, i === 1]);
  }
  const after = await stats();
  assert.equal(after.salonsCount, before.salonsCount + 1);
  assert.equal(after.citiesCount, before.citiesCount + 1);
  assert.equal(after.reviewsCount, before.reviewsCount + 1);
  if (before.reviewsCount === 0) assert.equal(after.averageRating, 5);
  // Changing private reviews must not change any public aggregate.
  await pool.query("UPDATE reviews SET rating=2 WHERE id=ANY($1::text[])", [reviewIds.slice(1)]);
  assert.deepEqual(await stats(), after);
  console.log("PASS: actual public HTTP/SQL stats allowlist and exclusion of hidden, inactive, blocked and unlisted reviews");
} finally {
  server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));
  await pool.query("DELETE FROM reviews WHERE id=ANY($1::text[])", [reviewIds]);
  await pool.query("DELETE FROM salons WHERE id=ANY($1::text[])", [salonIds]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [userIds]);
  await pool.end();
}
await new Promise(r => setTimeout(r, 1000)); process.exit(0);
