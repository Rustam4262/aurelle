import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { bookings } = await import("../shared/schema");
const { canClientCancelBooking, cancelClientBooking } = await import("../server/lib/booking-cancellation");
const now = new Date("2026-10-21T05:00:00Z");
const base = { status: "confirmed", bookingDate: new Date("2026-10-21T00:00:00Z"), startTime: "10:01" };
assert.equal(canClientCancelBooking(base, now), true);
assert.equal(canClientCancelBooking({...base, startTime: "10:00"}, now), false);
assert.equal(canClientCancelBooking({...base, startTime: "09:59"}, now), false);
for (const status of ["completed", "cancelled", "no_show", "unknown", null]) {
  assert.equal(canClientCancelBooking({...base, status}, now), false);
}
assert.equal(canClientCancelBooking({...base, status: "pending"}, now), true);
assert.equal(canClientCancelBooking({...base, startTime: "bad"}, now), false);
assert.equal(canClientCancelBooking({...base, bookingDate: new Date(NaN)}, now), false);
const columns = Object.values(getTableColumns(bookings)).map(c =>
  `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
await pool.query(`CREATE TABLE IF NOT EXISTS bookings (${columns.join(",")})`);
const ids: string[] = [];
const owner = randomUUID(), profile = randomUUID();
async function insert(status: string, client = owner) {
  const id = randomUUID(); ids.push(id);
  await pool.query("INSERT INTO bookings (id,client_id,status,booking_date,start_time) VALUES ($1,$2,$3,'2099-01-01','12:00')", [id,client,status]);
  return id;
}
try {
  const id = await insert("confirmed");
  assert.equal((await cancelClientBooking(id, [randomUUID()])).ok, false);
  const results = await Promise.all([cancelClientBooking(id, [owner,profile]),cancelClientBooking(id,[owner,profile])]);
  assert.equal(results.filter(r => r.ok).length, 1);
  assert.equal((await pool.query("SELECT status FROM bookings WHERE id=$1",[id])).rows[0].status, "cancelled");
  assert.equal((await cancelClientBooking(await insert("pending", profile), [owner,profile])).ok, true);
  assert.equal((await cancelClientBooking(await insert("completed"), [owner,profile])).ok, false);
  // Another transaction completes the visit while cancellation waits on its row lock.
  const race = await insert("confirmed");
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("UPDATE bookings SET status='completed' WHERE id=$1",[race]);
    const pending = cancelClientBooking(race,[owner]);
    await connection.query("COMMIT");
    assert.equal((await pending).ok, false);
  } finally { connection.release(); }
  console.log("PASS: Tashkent start boundary, statuses, ownership, legacy profile IDs, concurrent cancellation/completion");
} finally {
  await pool.query("DELETE FROM bookings WHERE id=ANY($1::text[])",[ids]);
  await pool.end();
}
