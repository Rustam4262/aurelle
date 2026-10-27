import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { db, pool } = await import("../server/db");
const { bookings } = await import("../shared/schema");
const { lockRescheduleSnapshot, rescheduleInput, BookingRescheduleConflict } = await import("../server/lib/booking-reschedule-guard");
assert.ok(rescheduleInput.safeParse({newBookingDate:"2099-01-01",newStartTime:"10:00"}).success);
for (const input of [
  {newBookingDate:"2026-02-30",newStartTime:"10:00"},
  {newBookingDate:"2026-10-21T00:00:00Z",newStartTime:"10:00"},
  {newBookingDate:"2099-01-01",newStartTime:"24:00"},
  {newBookingDate:"2099-01-01",newStartTime:"10:00",reason:{}},
]) assert.equal(rescheduleInput.safeParse(input).success,false);
const cols=Object.values(getTableColumns(bookings)).map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`);
await pool.query(`CREATE TABLE IF NOT EXISTS bookings (${cols.join(",")})`);
const id=randomUUID();
await pool.query("INSERT INTO bookings (id,status,booking_date,start_time,end_time) VALUES ($1,'confirmed','2099-01-01','10:00','11:00')",[id]);
const snapshot=async()=> (await db.select().from(bookings).where(eq(bookings.id,id)))[0];
const move=async(s: Awaited<ReturnType<typeof snapshot>>, time:string)=>db.transaction(async tx=>{
  await lockRescheduleSnapshot(tx,s);
  await tx.update(bookings).set({startTime:time}).where(eq(bookings.id,id));
});
try {
  const original=await snapshot();
  const race=await Promise.allSettled([move(original,"12:00"),move(original,"13:00")]);
  assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
  assert.ok(race.some(r=>r.status==="rejected" && r.reason instanceof BookingRescheduleConflict));
  for (const status of ["cancelled","completed","in_progress","no_show"]) {
    await pool.query("UPDATE bookings SET status=$2 WHERE id=$1",[id,status]);
    await assert.rejects(move(await snapshot(),"14:00"),BookingRescheduleConflict);
  }
  await pool.query("UPDATE bookings SET status='confirmed',booking_date='2020-01-01' WHERE id=$1",[id]);
  await assert.rejects(move(await snapshot(),"14:00"),BookingRescheduleConflict);
  await pool.query("UPDATE bookings SET booking_date='2099-01-01' WHERE id=$1",[id]);
  const before=await snapshot();
  const conn=await pool.connect();
  try {
    await conn.query("BEGIN");
    await conn.query("UPDATE bookings SET status='cancelled' WHERE id=$1",[id]);
    const pending=move(before,"15:00");
    const rejection=assert.rejects(pending,BookingRescheduleConflict);
    await conn.query("COMMIT");
    await rejection;
  } finally {conn.release();}
  assert.equal((await snapshot()).status,"cancelled");
  console.log("PASS: date/time input, concurrent moves, cancellation race, terminal/started/past booking guards");
} finally {
  await pool.query("DELETE FROM bookings WHERE id=$1",[id]);
  await pool.end();
}
