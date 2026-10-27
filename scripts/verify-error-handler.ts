import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { errorHandler } from "../server/middleware/requestErrorHandler";
import { logger } from "../server/lib/logger";

const originalLog = logger.error;
let logged = 0;
logger.error = () => { logged++; };
const app = express();
app.use(express.json());
app.get("/failure", () => { throw new Error("private database details"); });
app.get("/invalid-status", () => { throw Object.assign(new Error("private details"), { status: 200 }); });
app.get("/conflict", () => { throw Object.assign(new Error("Already booked"), { status: 409 }); });
app.get("/healthy", (_req, res) => { res.json({ ok: true }); });
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${(server.address() as any).port}`;
try {
  for (const path of ["/failure", "/invalid-status"]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { message: "Internal Server Error" });
  }
  const conflict = await fetch(base + "/conflict");
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { message: "Already booked" });
  const malformed = await fetch(base + "/healthy", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: '{"private":',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { message: "Invalid JSON body" });
  assert.deepEqual(await (await fetch(base + "/healthy")).json(), { ok: true });
  assert.equal(logged, 2);
  const original = new Error("stream failure");
  let forwarded: unknown;
  errorHandler(original, {} as any, { headersSent: true } as any, (err) => { forwarded = err; });
  assert.equal(forwarded, original);
  console.log("PASS: safe 5xx responses, valid 4xx, malformed JSON, continued service and headers-sent delegation");
} finally {
  logger.error = originalLog;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
