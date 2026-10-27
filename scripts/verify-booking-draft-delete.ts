import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, bookingDrafts, userProfiles } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/client.routes");
for (const [name, table] of [["users",users],["booking_drafts",bookingDrafts],["user_profiles",userProfiles]] as const) {
  const cols=Object.values(getTableColumns(table));
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`).join(",")})`);
}
const first=randomUUID(), second=randomUUID(), draftA=randomUUID(), draftB=randomUUID();
const app=express();
app.use((req:any,_res,next)=>{const sub=req.headers["x-test-user"];if(sub)req.session={passport:{user:{claims:{sub}}},destroy:()=>{}};next();});
app.use("/api/client",routes);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const base=`http://127.0.0.1:${(server.address() as any).port}/api/client/bookings`;
const remove=(id:string,user?:string)=>fetch(`${base}/${id}`,{method:"DELETE",headers:user?{"x-test-user":user}:{}});
try {
  await pool.query("INSERT INTO users(id) VALUES($1),($2)",[first,second]);
  await pool.query("INSERT INTO booking_drafts(id,user_id,expires_at) VALUES($1,$2,now()+interval '1 day'),($3,$4,now()+interval '1 day')",[draftA,first,draftB,second]);
  assert.equal((await remove("draft")).status,401);
  assert.equal((await pool.query("SELECT id FROM booking_drafts WHERE id=ANY($1::text[])",[[draftA,draftB]])).rowCount,2);
  const response=await remove("draft",first);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.deepEqual((await pool.query("SELECT id FROM booking_drafts WHERE id=ANY($1::text[])",[[draftA,draftB]])).rows,[{id:draftB}]);
  assert.equal((await remove("draft",first)).status,200);
  // Ordinary IDs must still reach the booking cancellation route.
  const missing=await remove(randomUUID(),first);assert.equal(missing.status,404);assert.deepEqual(await missing.json(),{error:"Booking not found"});
  assert.equal((await pool.query("SELECT id FROM booking_drafts WHERE id=$1",[draftB])).rowCount,1);
  assert.equal((await remove("draft",second)).status,200);
  console.log("PASS: draft DELETE route, authentication, user isolation, repeat deletion and ordinary booking route (Express + local PostgreSQL)");
} finally {
  server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
  await pool.query("DELETE FROM booking_drafts WHERE id=ANY($1::text[])",[[draftA,draftB]]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])",[[first,second]]);await pool.end();
}
await new Promise(r=>setTimeout(r,1000));process.exit(0);
