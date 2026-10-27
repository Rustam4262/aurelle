import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { bookings, salons, masters } = await import("../shared/schema");
const { bookingStatusError, changeBookingStatus } = await import("../server/lib/booking-status");
const now = new Date("2026-10-21T06:00:00Z");
const base = {status: "confirmed", bookingDate: new Date("2026-10-21T00:00:00Z"), endTime: "11:00"};
assert.equal(bookingStatusError(base,"completed",now), undefined);
assert.ok(bookingStatusError({...base,endTime:"11:01"},"completed",now));
for (const current of ["completed","cancelled","no_show",null]) {
  assert.ok(bookingStatusError({...base,status:current},"confirmed",now));
}
assert.ok(bookingStatusError({...base,status:"pending"},"completed",now));
assert.ok(bookingStatusError(base,"pending",now));
assert.ok(bookingStatusError({...base,endTime:"24:00"},"completed",now));
assert.ok(bookingStatusError({...base,startTime:"11:01"},"in_progress",now));
assert.ok(bookingStatusError({...base,startTime:"11:01"},"no_show",now));
assert.equal(bookingStatusError({...base,startTime:"11:00"},"in_progress",now),undefined);
assert.equal(bookingStatusError({...base,startTime:"11:00"},"no_show",now),undefined);
assert.equal(bookingStatusError({...base,status:"in_progress"},"completed",now),undefined);
for (const [name, table] of [["bookings",bookings],["salons",salons],["masters",masters]] as const) {
  const cols = Object.values(getTableColumns(table)).map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.join(",")})`);
}
const userId = randomUUID(), salonId = randomUUID(), masterId = randomUUID();
const actor = {kind: "owner" as const,userId};
const ids: string[] = [];
await pool.query("INSERT INTO salons (id,owner_id) VALUES ($1,$2)",[salonId,userId]);
await pool.query("INSERT INTO masters (id,user_id) VALUES ($1,$2)",[masterId,userId]);
async function insert(status: string, solo=false, date="2020-01-01") {
  const id=randomUUID();ids.push(id);
  await pool.query("INSERT INTO bookings (id,salon_id,master_id,status,booking_date,start_time,end_time) VALUES ($1,$2,$3,$4,$5,'10:00','11:00')",[id,solo?null:salonId,masterId,status,date]);
  return id;
}
try {
  const id=await insert("pending");
  assert.equal((await changeBookingStatus(id,"confirmed",{...actor,userId:randomUUID()})).ok,false);
  assert.equal((await changeBookingStatus(id,"arbitrary",actor)).ok,false);
  assert.equal((await changeBookingStatus(id,"completed",actor)).ok,false);
  assert.equal((await changeBookingStatus(id,"confirmed",actor)).ok,true);
  const repeated=await changeBookingStatus(id,"confirmed",actor);
  assert.ok(repeated.ok && !repeated.changed);
  const race=await Promise.all([changeBookingStatus(id,"completed",actor),changeBookingStatus(id,"cancelled",actor)]);
  assert.equal(race.filter(r=>r.ok).length,1);
  assert.equal((await changeBookingStatus(id,"confirmed",actor)).ok,false);
  assert.equal((await changeBookingStatus(await insert("confirmed",false,"2099-01-01"),"completed",actor)).ok,false);
  const solo=await insert("confirmed",true);
  assert.equal((await changeBookingStatus(solo,"completed",actor)).ok,false);
  assert.equal((await changeBookingStatus(solo,"completed",{kind:"solo_master",userId:randomUUID()})).ok,false);
  assert.equal((await changeBookingStatus(solo,"completed",{kind:"solo_master",userId})).ok,true);
  assert.equal((await changeBookingStatus(await insert("confirmed"),"completed",{kind:"solo_master",userId})).ok,false);
  console.log("PASS: transition rules, completion time, owner/master access, idempotency and conflicting concurrent updates");
} finally {
  await pool.query("DELETE FROM bookings WHERE id=ANY($1::text[])",[ids]);
  await pool.query("DELETE FROM masters WHERE id=$1",[masterId]);
  await pool.query("DELETE FROM salons WHERE id=$1",[salonId]);
  await pool.end();
}
