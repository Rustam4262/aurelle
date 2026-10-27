import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { setCsrfCookie, verifyCsrf } from "../server/middleware/csrf";
import { logger } from "../server/lib/logger";

const warn = logger.warn;
logger.warn = () => {};
const app = express();
app.use(setCsrfCookie);
app.use(verifyCsrf);
app.all("/", (_req, res) => { res.json({ ok: true }); });
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const url = `http://127.0.0.1:${(server.address() as any).port}/`;
try {
  const initial = await fetch(url);
  assert.equal(initial.status, 200);
  const token = initial.headers.get("set-cookie")?.match(/csrf-token=([a-f0-9]{64})/)?.[1];
  assert.ok(token);
  const good = { cookie: `csrf-token=${token}`, "x-csrf-token": token };
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal((await fetch(url, {method, headers: good})).status, 200);
    assert.equal((await fetch(url, {method})).status, 403);
  }
  for (const bad of ["%", "%E0%A4%A", "short", "z".repeat(64), "a".repeat(63), "a".repeat(65)]) {
    const res = await fetch(url, {method: "POST", headers: {cookie: `csrf-token=${bad}`, "x-csrf-token": bad}});
    assert.equal(res.status, 403);
    assert.match(res.headers.get("set-cookie") || "", /csrf-token=[a-f0-9]{64}/);
  }
  assert.equal((await fetch(url, {method: "POST", headers: {...good, "x-csrf-token": "b".repeat(64)}})).status, 403);
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.equal((await fetch(url, {method, headers: {cookie: "csrf-token=%"}})).status, 200);
  }
  console.log("PASS: CSRF valid/missing/mismatched/malformed tokens, safe methods and cookie recovery");
} finally {
  logger.warn = warn;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
