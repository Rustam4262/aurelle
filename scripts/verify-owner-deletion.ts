import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { readFile } from "node:fs/promises";
import { getTableColumns } from "drizzle-orm";

// Disposable local database only; never load production credentials.
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, salons, masters, services, bookings } = await import("../shared/schema");
const { default: ownerRoutes } = await import("../server/routes/owner.routes");
for (const [name, table] of [["users", users], ["salons", salons], ["masters", masters], ["services", services], ["bookings", bookings]] as const) {
  const cols = Object.values(getTableColumns(table)).map(c => `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.join(",")})`);
}
const ownerId = randomUUID(), strangerId = randomUUID(), salonId = randomUUID(), otherSalon = randomUUID();
const resourceIds: string[] = [];
const bookingIds: string[] = [];
await pool.query(await readFile(new URL("../migrations/0046_preserve_booking_resources.sql", import.meta.url), "utf8"));
await pool.query("INSERT INTO users (id) VALUES ($1),($2)", [ownerId, strangerId]);
await pool.query("INSERT INTO salons (id,owner_id) VALUES ($1,$2),($3,$2)", [salonId, ownerId, otherSalon]);
const app = express();
app.use((req: any, _res, next) => {
  // Session injection for local HTTP tests. Actual route authentication still queries users.
  const id = req.headers["x-test-user"];
  if (id) req.session = { passport: { user: { claims: { sub: id } } }, destroy: () => {} };
  next();
});
app.use("/owner", ownerRoutes);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${(server.address() as any).port}`;
async function remove(kind: string, id: string, actor: string | null = ownerId) {
  return fetch(`${base}/owner/salons/${salonId}/${kind}/${id}`, {
    method: "DELETE", headers: actor ? { "x-test-user": actor } : {},
  });
}
try {
  for (const kind of ["services", "masters"]) {
    const id = randomUUID(), foreignId = randomUUID();
    resourceIds.push(id, foreignId);
    await pool.query(`INSERT INTO ${kind} (id,salon_id) VALUES ($1,$2),($3,$4)`, [id, salonId, foreignId, otherSalon]);
    assert.equal((await remove(kind, id, null)).status, 401);
    assert.equal((await remove(kind, id, strangerId)).status, 403);
    assert.equal((await remove(kind, foreignId)).status, 404);
    assert.equal((await remove(kind, randomUUID())).status, 404);
    const results = await Promise.all([remove(kind, id), remove(kind, id)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 404]);
    assert.deepEqual(await results.find(r => r.status === 200)!.json(), { success: true });
    assert.equal((await remove(kind, id)).status, 404);
    assert.equal((await pool.query(`SELECT id FROM ${kind} WHERE id=$1`, [foreignId])).rowCount, 1);
    const ref = kind === "services" ? "service_id" : "master_id";
    for (const status of ["pending", "confirmed", "completed", "cancelled", "no_show"]) {
      const protectedId = randomUUID(), bookingId = randomUUID();
      resourceIds.push(protectedId); bookingIds.push(bookingId);
      await pool.query(`INSERT INTO ${kind} (id,salon_id) VALUES ($1,$2)`, [protectedId, salonId]);
      await pool.query(`INSERT INTO bookings (id,${ref},status) VALUES ($1,$2,$3)`, [bookingId, protectedId, status]);
      const response = await remove(kind, protectedId);
      assert.equal(response.status, 409);
      assert.equal((await response.json()).code, "BOOKING_HISTORY_EXISTS");
      assert.equal((await pool.query(`SELECT ${ref} FROM bookings WHERE id=$1`, [bookingId])).rows[0][ref], protectedId);
    }
    // A concurrent booking waits for deletion's row lock, then fails its FK instead of becoming orphaned.
    const raceId = randomUUID(), raceBookingId = randomUUID();
    resourceIds.push(raceId); bookingIds.push(raceBookingId);
    await pool.query(`INSERT INTO ${kind} (id,salon_id) VALUES ($1,$2)`, [raceId, salonId]);
    const tx = await pool.connect();
    try {
      await tx.query("BEGIN");
      await tx.query(`DELETE FROM ${kind} WHERE id=$1`, [raceId]);
      const insert = pool.query(`INSERT INTO bookings (id,${ref}) VALUES ($1,$2)`, [raceBookingId, raceId]).then(() => null, e => e);
      await tx.query("COMMIT");
      const error = await insert;
      assert.equal(error?.code, "23503");
      const { getBookingConflictError } = await import("../server/lib/booking-db-errors");
      assert.equal(getBookingConflictError(error)?.code, "BOOKING_RESOURCE_UNAVAILABLE");
    } finally { await tx.query("ROLLBACK"); tx.release(); }
  }
  console.log("PASS: HTTP/SQL deletion, authorization, all booking statuses preserved, deletion/booking race protected by FK");
} finally {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.query("DELETE FROM bookings WHERE id=ANY($1::text[])", [bookingIds]);
  for (const table of ["services", "masters"]) await pool.query(`DELETE FROM ${table} WHERE id=ANY($1::text[])`, [resourceIds]);
  await pool.query("DELETE FROM salons WHERE id=ANY($1::text[])", [[salonId, otherSalon]]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [[ownerId, strangerId]]);
  await pool.end();
}
await new Promise(resolve => setTimeout(resolve, 1000));
process.exit(0);
