import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
import { isValidWaitlistDate } from "../server/lib/waitlist-date";
const boundary=new Date("2026-10-26T19:00:00Z");
assert.equal(isValidWaitlistDate("2026-10-26",boundary),false);
assert.equal(isValidWaitlistDate("2026-10-27",boundary),true);
assert.equal(isValidWaitlistDate("2026-10-26",new Date("2026-10-26T18:59:59Z")),true);
assert.equal(isValidWaitlistDate("2028-02-29",boundary),true);
for(const date of ["2027-02-29","2026-02-30","2026-13-01","2026-00-01","2026-10-00","2026-1-1","", "invalid"])
  assert.equal(isValidWaitlistDate(date,boundary),false,date);
assert.equal(isValidWaitlistDate(null,boundary),true);
assert.equal(isValidWaitlistDate(undefined,boundary),true);
process.env.DATABASE_URL="postgres://security_test@127.0.0.1:55441/postgres";
const {pool}=await import("../server/db");
const {users,userProfiles,salons,services,waitlist}=await import("../shared/schema");
const {default:routes}=await import("../server/routes/waitlist.routes");
for(const [name,table] of [["users",users],["user_profiles",userProfiles],["salons",salons],["services",services],["waitlist",waitlist]] as const){
  const cols=Object.values(getTableColumns(table));
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`).join(",")})`);
}
const user=randomUUID(),profile=randomUUID(),salon=randomUUID(),service=randomUUID();
const app=express();app.use(express.json());app.use((req:any,_res,next)=>{const sub=req.headers["x-test-user"];if(sub)req.session={passport:{user:{claims:{sub}}},destroy:()=>{}};next();});app.use("/waitlist",routes);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const url=`http://127.0.0.1:${(server.address() as any).port}/waitlist`;
const post=(preferredDate:unknown,auth=true)=>fetch(url,{method:"POST",headers:{"Content-Type":"application/json",...(auth?{"x-test-user":user}:{})},body:JSON.stringify({salonId:salon,serviceId:service,preferredDate})});
try {
  await pool.query("INSERT INTO users(id) VALUES($1)",[user]);
  await pool.query("INSERT INTO user_profiles(id,user_id) VALUES($1,$2)",[profile,user]);
  await pool.query("INSERT INTO salons(id) VALUES($1)",[salon]);
  await pool.query("INSERT INTO services(id,salon_id) VALUES($1,$2)",[service,salon]);
  assert.equal((await post("2099-01-01",false)).status,401);
  for(const date of ["2000-01-01","2099-02-30","bad",""])assert.equal((await post(date)).status,400,date);
  assert.equal((await pool.query("SELECT id FROM waitlist WHERE client_id=$1",[profile])).rowCount,0);
  const today=new Date(Date.now()+5*3600000).toISOString().slice(0,10);
  for(const date of [today,"2099-01-01",null,undefined]){
    const response=await post(date);assert.equal(response.status,201,await response.text());
    assert.equal((await pool.query("SELECT id FROM waitlist WHERE client_id=$1",[profile])).rowCount,1);
    await pool.query("DELETE FROM waitlist WHERE client_id=$1",[profile]);
  }
  console.log("PASS: Tashkent midnight boundary, real calendar/leap dates, past-date rejection, auth, today/future/unspecified dates through Express + PostgreSQL");
} finally {
  server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
  await pool.query("DELETE FROM waitlist WHERE client_id=$1",[profile]);
  await pool.query("DELETE FROM services WHERE id=$1",[service]);await pool.query("DELETE FROM salons WHERE id=$1",[salon]);
  await pool.query("DELETE FROM user_profiles WHERE id=$1",[profile]);await pool.query("DELETE FROM users WHERE id=$1",[user]);await pool.end();
}
await new Promise(r=>setTimeout(r,1000));process.exit(0);
