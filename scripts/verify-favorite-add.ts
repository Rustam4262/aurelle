import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, favorites, salons } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/favorites.routes");
for (const [name, table] of [["users",users],["favorites",favorites],["salons",salons]] as const) {
  const cols=Object.values(getTableColumns(table));
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.map(c=>`"${c.name}" ${c.getSQLType()}${c.name==="id"?" PRIMARY KEY DEFAULT gen_random_uuid()":""}`).join(",")})`);
}
const user=randomUUID(), other=randomUUID(), salon=randomUUID(), concurrent=randomUUID(), missing=randomUUID();
const app=express();app.use(express.json());
app.use((req:any,_res,next)=>{const sub=req.headers["x-test-user"];if(sub)req.session={passport:{user:{claims:{sub}}},destroy:()=>{}};next();});
app.use("/favorites",routes);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const base=`http://127.0.0.1:${(server.address() as any).port}/favorites`;
const post=(path:string,body:unknown,who?:string)=>fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(who?{"x-test-user":who}:{})},body:JSON.stringify(body)});
try {
  await pool.query("INSERT INTO users(id) VALUES($1),($2)",[user,other]);
  await pool.query("INSERT INTO salons(id) VALUES($1),($2)",[salon,concurrent]);
  assert.equal((await post("/",{salonId:salon})).status,401);
  assert.equal((await post("/",{},user)).status,400);
  assert.equal((await post("/",{salonId:missing},user)).status,404);
  assert.equal((await post('/'+missing,{},user)).status,404);
  const first=await post("/",{salonId:salon},user);assert.equal(first.status,201);const favorite=await first.json();
  const second=await post("/",{salonId:salon},user);assert.equal(second.status,200);assert.equal((await second.json()).id,favorite.id);
  const results=await Promise.all([post("/",{salonId:concurrent},user),post("/",{salonId:concurrent},user)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
  assert.equal((await pool.query("SELECT id FROM favorites WHERE user_id=$1 AND salon_id=$2",[user,concurrent])).rowCount,1);
  assert.equal((await post("/",{salonId:salon},other)).status,201);
  assert.deepEqual(await (await post('/'+salon,{},user)).json(),{favorited:false});
  assert.equal((await pool.query("SELECT id FROM favorites WHERE user_id=$1 AND salon_id=$2",[other,salon])).rowCount,1);
  const toggles=await Promise.all([post('/'+salon,{},user),post('/'+salon,{},user)]);
  const states=await Promise.all(toggles.map(r=>r.json()));assert.deepEqual(states.map(r=>r.favorited).sort(),[false,true]);
  assert.equal((await pool.query("SELECT id FROM favorites WHERE user_id=$1 AND salon_id=$2",[user,salon])).rowCount,0);
  assert.equal((await pool.query("SELECT id FROM favorites WHERE salon_id=$1",[missing])).rowCount,0);
  console.log("PASS: auth, validation, missing salon, repeat/concurrent add, concurrent toggle and user isolation (Express + PostgreSQL)");
} finally {
  server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
  await pool.query("DELETE FROM favorites WHERE user_id=ANY($1::text[])",[[user,other]]);
  await pool.query("DELETE FROM salons WHERE id=ANY($1::text[])",[[salon,concurrent]]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])",[[user,other]]);await pool.end();
}
await new Promise(r=>setTimeout(r,1000));process.exit(0);
