import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, readFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
process.env.DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";
const { registerUploadRoutes } = await import("../server/uploadRoutes");
const root=await mkdtemp(path.join(process.cwd(),"tmp","delete-security-"));
const originalCwd=process.cwd();
const folder=path.join(root,"server","uploads","avatars");
await mkdir(folder,{recursive:true});
const victim=path.join(folder,"other-user.jpg");
await writeFile(victim,"must survive");
process.chdir(root);
const app=express();registerUploadRoutes(app);
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const base=`http://127.0.0.1:${(server.address() as any).port}`;
const token="a".repeat(64);
try {
  for(const filename of ["other-user.jpg","missing.jpg","..%2F..%2Fsecret","..%5C..%5Csecret","%2Fetc%2Fpasswd"]) {
    const response=await fetch(base+"/api/upload/avatars/"+filename,{method:"DELETE",headers:{cookie:`csrf-token=${token}`,"X-CSRF-Token":token}});
    assert.equal(response.status,410);
    assert.deepEqual(await response.json(),{error:"Direct file deletion is unavailable"});
    assert.equal(await readFile(victim,"utf8"),"must survive");
  }
  console.log("PASS: actual upload router refuses deletion and traversal paths; existing file unchanged");
} finally {
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  process.chdir(originalCwd);await unlink(victim);
  for(const directory of [folder,path.dirname(folder),path.dirname(path.dirname(folder)),root])await rmdir(directory);
}
await new Promise(resolve=>setTimeout(resolve,1000));
process.exit(0);
