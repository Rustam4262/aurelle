import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
process.env.DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";
const { default: routes } = await import("../server/routes/index");
const { registerUploadRoutes } = await import("../server/uploadRoutes");
const { logger } = await import("../server/lib/logger");
logger.warn = () => {};
const app = express();
app.use(express.json());
registerUploadRoutes(app);
app.use("/api", routes);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${(server.address() as any).port}`;
try {
  for (const path of ["/profile", "/invitations/accept", "/favorites", "/push/subscribe",
    "/notifications", "/calendar", "/waitlist", "/portfolio", "/master/profile",
    "/client/profile", "/solo-master/profile", "/complaints", "/payments/create", "/upload/avatar"]) {
    const r = await fetch(base + "/api" + path, {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}"});
    assert.equal(r.status, 403, path);
    assert.deepEqual(await r.json(), {error: "CSRF token mismatch"}, path);
  }
  const token = "a".repeat(64);
  for (const path of ["/profile", "/upload/avatar"]) {
    const r = await fetch(base + "/api" + path, {method: "POST", headers: {
      "Content-Type": "application/json", cookie: `csrf-token=${token}`, "X-CSRF-Token": token,
    }, body: "{}"});
    assert.equal(r.status, 401, path);
  }
  // The root-mounted profile router must not accidentally gate provider callbacks.
  for (const path of ["/webhooks/payme", "/webhooks/click"]) {
    const r = await fetch(base + "/api" + path, {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}"});
    assert.doesNotMatch(await r.text(), /CSRF token mismatch/, path);
  }
  console.log("PASS: actual route protection, valid-token auth boundary, webhook exclusions");
} finally {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
// Allow the TS loader's pending Windows I/O callbacks to drain before exiting.
await new Promise(resolve => setTimeout(resolve, 1000));
process.exit(0);
