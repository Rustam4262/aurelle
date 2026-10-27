import assert from "node:assert/strict";
import express from "express";
import sharp from "sharp";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import { upload, setUploadType } from "../server/upload";
const cwd=process.cwd();
const root=await mkdtemp(path.join(cwd,"tmp","upload-security-"));
process.chdir(root);
const dir=path.join(root,"server","uploads","avatars");
const app=express();
app.post("/",setUploadType("avatars"),upload.array("images",10),(_req,res)=>res.json({ok:true}));
app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status||400).json({error:"rejected"}));
const server=app.listen(0,"127.0.0.1");await once(server,"listening");
const url=`http://127.0.0.1:${(server.address() as any).port}/`;
const files=async()=>readdir(dir).catch(()=>[] as string[]);
async function send(data:Buffer,mime="image/png") {
  const form=new FormData();form.append("images",new Blob([new Uint8Array(data)],{type:mime}),"фото.png");
  return fetch(url,{method:"POST",body:form});
}
try {
  for(const format of ["png","jpeg","webp"] as const) {
    const raw=await sharp({create:{width:16,height:16,channels:3,background:"red"}})[format]().toBuffer();
    assert.equal((await send(Buffer.concat([raw,Buffer.from("APPENDED_PAYLOAD")]))).status,200);
  }
  for(const filename of await files()) {
    assert.match(filename,/^[a-f0-9]{32}\.jpg$/);
    const saved=await readFile(path.join(dir,filename));
    assert.equal((await sharp(saved).metadata()).format,"jpeg");
    assert.equal(saved.includes(Buffer.from("APPENDED_PAYLOAD")),false);
  }
  const before=(await files()).length;
  for(const bad of [Buffer.from("<script>alert(1)</script>"),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),Buffer.from([137,80,78,71,13,10,26,10])]) {
    assert.equal((await send(bad)).status,400);
  }
  assert.equal((await send(Buffer.alloc(5*1024*1024+1))).status,400);
  assert.equal((await files()).length,before);
  const big=await sharp({create:{width:5000,height:5000,channels:3,background:"white"}}).png().toBuffer();
  assert.equal((await send(big)).status,400);
  assert.equal((await files()).length,before);
  console.log("PASS: real JPEG/PNG/WebP, JPEG output, stripped trailing payload, forged MIME, SVG, truncation, byte/pixel limits, no invalid public files");
} finally {
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  process.chdir(cwd);
  for(const name of await files())await unlink(path.join(dir,name));
  for(const folder of [dir,path.dirname(dir),path.dirname(path.dirname(dir)),root])await rmdir(folder).catch(()=>{});
}
