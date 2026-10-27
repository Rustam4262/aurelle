import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, userProfiles, salons, bookings } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/owner.routes");
for (const [name, table] of [["users",users],["user_profiles",userProfiles],["salons",salons],["bookings",bookings]] as const) {
  const cols=Object.values(getTableColumns(table));
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`).join(",")})`);
  for(const c of cols) await pool.query(`ALTER TABLE ${name} ADD COLUMN IF NOT EXISTS "${c.name}" ${c.getSQLType()}`);
}
const owner=randomUUID(), client=randomUUID(), noProfile=randomUUID(), emailOnly=randomUUID(), collision=randomUUID();
const userIds=[owner,client,noProfile,emailOnly,collision], profileId=randomUUID(), salonId=randomUUID();
const bookingIds: string[]=[];
for(const id of userIds) await pool.query("INSERT INTO users(id) VALUES($1)",[id]);
await pool.query("UPDATE users SET first_name='Account',last_name='Name',profile_image_url='/account.jpg' WHERE id=$1",[client]);
await pool.query("UPDATE users SET first_name='No',last_name='Profile',profile_image_url='/oauth.jpg' WHERE id=$1",[noProfile]);
await pool.query("UPDATE users SET email=$2 WHERE id=$1",[emailOnly,`qa-${emailOnly}@example.invalid`]);
await pool.query("UPDATE users SET first_name='Canonical account' WHERE id=$1",[collision]);
await pool.query("INSERT INTO user_profiles(id,user_id,full_name,avatar_url) VALUES($1,$2,'Profile Name','/profile.jpg'),($3,$4,'Other profile',null)",[profileId,client,collision,emailOnly]);
await pool.query("INSERT INTO salons(id,owner_id) VALUES($1,$2)",[salonId,owner]);
const missing=randomUUID();
const refs=[client,profileId,noProfile,collision,missing];
for(const ref of refs){const id=randomUUID();bookingIds.push(id);await pool.query("INSERT INTO bookings(id,salon_id,client_id) VALUES($1,$2,$3)",[id,salonId,ref]);}
const app=express();app.use((req:any,_res,next)=>{const sub=req.headers["x-test-user"];if(sub)req.session={passport:{user:{claims:{sub}}},destroy:()=>{}};next();});app.use("/owner",routes);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const url=`http://127.0.0.1:${(server.address() as any).port}/owner/salons/${salonId}/bookings`;
try {
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers:{"x-test-user":client}})).status,403);
  const response=await fetch(url,{headers:{"x-test-user":owner}});assert.equal(response.status,200);
  const rows=await response.json();const byId=new Map<string,any>(rows.map((r:any)=>[r.id,r]));
  for(const index of [0,1]) assert.deepEqual(byId.get(bookingIds[index]).client,{fullName:"Profile Name",avatarUrl:"/profile.jpg"});
  assert.deepEqual(byId.get(bookingIds[2]).client,{fullName:"No Profile",avatarUrl:"/oauth.jpg"});
  assert.deepEqual(byId.get(bookingIds[3]).client,{fullName:"Canonical account",avatarUrl:null});
  assert.equal(byId.get(bookingIds[4]).client,null);
  for(const row of rows)if(row.client)assert.deepEqual(Object.keys(row.client).sort(),["avatarUrl","fullName"]);
  const {loadBookingClientDisplays}=await import("../server/lib/booking-client-display");
  assert.equal((await loadBookingClientDisplays([])).size,0);
  await pool.query("UPDATE user_profiles SET full_name='   ' WHERE id=$1",[profileId]);
  assert.equal((await loadBookingClientDisplays([client])).get(client)?.fullName,"Account Name");
  console.log("PASS: owner HTTP authorization, current/legacy IDs, name/avatar fallback, missing account, canonical ID collision precedence and response allowlist");
} finally {
  server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
  await pool.query("DELETE FROM bookings WHERE id=ANY($1::text[])",[bookingIds]);await pool.query("DELETE FROM salons WHERE id=$1",[salonId]);
  await pool.query("DELETE FROM user_profiles WHERE user_id=ANY($1::text[])",[userIds]);await pool.query("DELETE FROM users WHERE id=ANY($1::text[])",[userIds]);await pool.end();
}
await new Promise(r=>setTimeout(r,1000));process.exit(0);
