import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { getTableColumns } from "drizzle-orm";
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
const { pool } = await import("../server/db");
const { users, masters, soloMasterServices } = await import("../shared/schema");
const { default: routes } = await import("../server/routes/soloMaster.routes");
for (const [name, table] of [["users", users], ["masters", masters], ["solo_master_services", soloMasterServices]] as const) {
  const cols = Object.values(getTableColumns(table)).map(c => `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${cols.join(",")})`);
  // This disposable database is reused across regression runs; keep its
  // nullable fixture columns in step with the current application schema.
  for (const c of Object.values(getTableColumns(table))) {
    await pool.query(`ALTER TABLE ${name} ADD COLUMN IF NOT EXISTS "${c.name}" ${c.getSQLType()}`);
  }
}
const userIds = [randomUUID(),randomUUID()], masterIds = [randomUUID(),randomUUID()];
const ids = [randomUUID(),randomUUID(),randomUUID()], foreignId = randomUUID();
await pool.query("INSERT INTO users(id) VALUES($1),($2)", userIds);
await pool.query("INSERT INTO masters(id,user_id,is_solo_master) VALUES($1,$3,true),($2,$4,true)", [...masterIds,...userIds]);
for (const [i,id] of [...ids,foreignId].entries()) await pool.query("INSERT INTO solo_master_services(id,master_id,display_order) VALUES($1,$2,$3)", [id,i===3?masterIds[1]:masterIds[0],i]);
const app=express();app.use(express.json());app.use((req:any,_res,next)=>{
  const sub=req.headers["x-test-user"];if(sub)req.session={passport:{user:{claims:{sub}}},destroy:()=>{}};next();
});app.use("/solo",routes);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const url=`http://127.0.0.1:${(server.address() as any).port}/solo/services/reorder`;
async function reorder(serviceIds: unknown, user: string|null=userIds[0]) {
  return fetch(url,{method:"PUT",headers:{"Content-Type":"application/json",...(user?{"x-test-user":user}:{})},body:JSON.stringify({serviceIds})});
}
async function snapshot(){return (await pool.query("SELECT id,display_order FROM solo_master_services WHERE id=ANY($1::text[]) ORDER BY id",[[...ids,foreignId]])).rows;}
async function order(){return (await pool.query("SELECT id FROM solo_master_services WHERE master_id=$1 ORDER BY display_order",[masterIds[0]])).rows.map(r=>r.id);}
const trigger="qa_reorder_"+randomUUID().replaceAll("-","");
try {
  assert.equal((await reorder(ids,null)).status,401);
  assert.equal((await reorder([...ids].reverse())).status,200);
  assert.deepEqual(await order(),[...ids].reverse());
  const before=await snapshot();
  for(const invalid of [[],[ids[0],ids[0]],null,[""],[42]]){assert.equal((await reorder(invalid)).status,400);assert.deepEqual(await snapshot(),before);}
  for(const invalid of [[ids[0],foreignId],[ids[0],randomUUID()]]){assert.equal((await reorder(invalid)).status,404);assert.deepEqual(await snapshot(),before);}
  assert.equal((await reorder(ids,userIds[1])).status,404);assert.deepEqual(await snapshot(),before);
  await pool.query(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${ids[1]}' THEN RAISE EXCEPTION 'QA reorder failure'; END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON solo_master_services FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
  assert.equal((await reorder(ids)).status,500);assert.deepEqual(await snapshot(),before,"Earlier updates must roll back");
  await pool.query(`DROP TRIGGER ${trigger} ON solo_master_services`);await pool.query(`DROP FUNCTION ${trigger}()`);
  const second=[ids[1],ids[2],ids[0]];
  assert.deepEqual((await Promise.all([reorder(ids),reorder(second)])).map(r=>r.status),[200,200]);
  assert.ok([JSON.stringify(ids),JSON.stringify(second)].includes(JSON.stringify(await order())));
  console.log("PASS: actual HTTP route precedence, persisted order, authorization, invalid/mixed IDs, rollback and concurrent reorder");
} finally {
  server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
  await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON solo_master_services`);await pool.query(`DROP FUNCTION IF EXISTS ${trigger}()`);
  await pool.query("DELETE FROM solo_master_services WHERE id=ANY($1::text[])",[[...ids,foreignId]]);
  await pool.query("DELETE FROM masters WHERE id=ANY($1::text[])",[masterIds]);await pool.query("DELETE FROM users WHERE id=ANY($1::text[])",[userIds]);await pool.end();
}
await new Promise(r=>setTimeout(r,1000));process.exit(0);
