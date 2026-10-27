import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
process.env.DATABASE_URL="postgres://unused@127.0.0.1:1/unused";
process.env.EMAIL_ENABLED="false";
process.env.APP_VERSION="health-test";
delete process.env.REDIS_URL;
const {db,pool}=await import("../server/db");
const {logger}=await import("../server/lib/logger");
logger.error=()=>{};
const {default:router}=await import("../server/routes/health.routes");
const original=db.execute;
let broken=false;
db.execute=(async()=>{if(broken)throw Error("private database connection details");return {rows:[]};}) as any;
const app=express();app.use("/api",router);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const base=`http://127.0.0.1:${(server.address() as any).port}/api`;
try {
  for(const bad of [false,true]) {
    broken=bad;
    const r=await fetch(base+"/health");
    assert.equal(r.status,bad?503:200);
    assert.deepEqual(await r.json(),{status:bad?"unhealthy":"healthy",version:"health-test"});
  }
  for(const service of ["email","sms","redis","sentry"]) {
    const r=await fetch(base+"/health/"+service);
    const body=await r.json();assert.deepEqual(Object.keys(body),["status"]);
  }
  assert.equal((await fetch(base+"/health/ping")).status,200);
  console.log("PASS: readiness 200/503, no internal/error details, service status-only responses, liveness independent of DB");
} finally {
  db.execute=original;server.closeAllConnections();
  await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();
}
