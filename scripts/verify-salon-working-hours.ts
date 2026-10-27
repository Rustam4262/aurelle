import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, salons, salonWorkingHours } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/owner.routes");
for (const [name, table] of [["users", users], ["salons", salons], ["salon_working_hours", salonWorkingHours]] as const) {
  const cols = Object.values(getTableColumns(table)).map(c => `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.join(",")})`);
}
const ownerId = randomUUID(), strangerId = randomUUID(), salonId = randomUUID();
await pool.query("INSERT INTO users (id) VALUES ($1),($2)", [ownerId, strangerId]);
await pool.query("INSERT INTO salons (id,owner_id) VALUES ($1,$2)", [salonId, ownerId]);
const app = express(); app.use(express.json());
app.use((req: any, _res, next) => {
  const sub = req.headers["x-test-user"];
  if (sub) req.session = { passport: { user: { claims: { sub } } }, destroy: () => {} };
  next();
});
app.use("/owner", routes);
const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
const url = `http://127.0.0.1:${(server.address() as any).port}/owner/salons/${salonId}/hours`;
const hours = [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isClosed: false }];
async function save(body: unknown, actor: string | null = ownerId) {
  return fetch(url, { method: "POST", headers: {"Content-Type": "application/json", ...(actor ? {"x-test-user": actor} : {})}, body: JSON.stringify(body) });
}
async function stored() {
  return (await pool.query("SELECT * FROM salon_working_hours WHERE salon_id=$1 ORDER BY day_of_week", [salonId])).rows;
}
const trigger = "qa_hours_" + randomUUID().replaceAll("-", "");
try {
  assert.equal((await save({hours})).status, 200);
  const before = await stored();
  for (const body of [{}, {hours: []}, {hours: null}, {hours: [hours[0], hours[0]]},
    ...[{dayOfWeek: 9}, {dayOfWeek: 1.5}, {openTime: "99:99"}, {closeTime: "08:00"}, {closeTime: "09:00"}, {isClosed: "false"}]
      .map(change => ({hours: [{...hours[0], ...change}]}))]) {
    assert.equal((await save(body)).status, 400, JSON.stringify(body));
    assert.deepEqual(await stored(), before, "Invalid request must preserve original rows and IDs");
  }
  assert.equal((await save({hours}, null)).status, 401);
  assert.equal((await save({hours}, strangerId)).status, 403);
  assert.deepEqual(await stored(), before);
  // Force a genuine database failure after DELETE: the transaction must restore the old rows.
  await pool.query(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.salon_id = '${salonId}' THEN RAISE EXCEPTION 'QA insert failure'; END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER ${trigger} BEFORE INSERT ON salon_working_hours FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
  assert.equal((await save({hours})).status, 500);
  assert.deepEqual(await stored(), before, "Failed insert must roll back deletion");
  await pool.query(`DROP TRIGGER ${trigger} ON salon_working_hours`);
  await pool.query(`DROP FUNCTION ${trigger}()`);
  const first = [1,2,3].map(dayOfWeek => ({...hours[0], dayOfWeek, openTime: "10:00"}));
  const second = [4,5,6].map(dayOfWeek => ({...hours[0], dayOfWeek, openTime: "11:00"}));
  const results = await Promise.all([save({hours: first}), save({hours: second})]);
  assert.deepEqual(results.map(r => r.status), [200,200]);
  const actual = (await stored()).map(r => r.day_of_week);
  assert.ok(JSON.stringify(actual) === "[1,2,3]" || JSON.stringify(actual) === "[4,5,6]", "Concurrent replacements must not merge");
  assert.equal((await save({hours: [{...hours[0], isClosed: true, openTime: "00:00", closeTime: "00:00", salonId: strangerId, id: strangerId}]})).status, 200);
  const closed = await stored(); assert.equal(closed.length, 1); assert.equal(closed[0].is_closed, true); assert.notEqual(closed[0].id, strangerId);
  console.log("PASS: actual HTTP/PostgreSQL validation, original schedule preserved, forced insert rollback, concurrent replacement, closed day, authorization and field allowlist");
} finally {
  server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));
  await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON salon_working_hours`);
  await pool.query(`DROP FUNCTION IF EXISTS ${trigger}()`);
  await pool.query("DELETE FROM salon_working_hours WHERE salon_id=$1", [salonId]);
  await pool.query("DELETE FROM salons WHERE id=$1", [salonId]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [[ownerId,strangerId]]);
  await pool.end();
}
await new Promise(r => setTimeout(r, 1000)); process.exit(0);
