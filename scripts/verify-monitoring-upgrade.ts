import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { initializeSentry, setupSentryErrorHandler, Sentry } from "../server/lib/sentry";

// Synthetic DSN; replace the transport before capturing anything. No telemetry
// leaves the process and no production account is used.
process.env.SENTRY_DSN = "http://test@127.0.0.1:1/1";
process.env.SENTRY_FORCE_ENABLE = "true";
initializeSentry();
const client = Sentry.getClient();
assert.ok(client);
const transport = client.getTransport();
assert.ok(transport);
const envelopes: unknown[] = [];
transport.send = async (envelope) => { envelopes.push(envelope); return { statusCode: 200 }; };

const beforeSend = client.getOptions().beforeSend!;
const filtered = await beforeSend({
  request: {
    headers: { authorization: "test-secret", cookie: "test-session", "x-api-key": "test-key", accept: "application/json" },
    cookies: { session: "test-session" },
    data: { password: "test-password", resetToken: "test-reset", name: "Test" },
  },
}, {});
assert.ok(filtered?.request);
assert.deepEqual(filtered.request.headers, { accept: "application/json" });
assert.equal(filtered.request.cookies, undefined);
assert.deepEqual(filtered.request.data, { password: "[Filtered]", resetToken: "[Filtered]", name: "Test" });

const app = express();
app.get("/:status", (req, _res, next) => next(Object.assign(new Error(`monitoring-test-${req.params.status}`), { status: Number(req.params.status) })));
setupSentryErrorHandler(app);
app.use((error: Error & { status: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status).end());
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const url = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
  assert.equal((await fetch(`${url}/400`)).status, 400);
  assert.equal((await fetch(`${url}/500`)).status, 500);
  assert.equal(await Sentry.flush(5000), true);
  const captured = JSON.stringify(envelopes);
  assert.match(captured, /monitoring-test-500/);
  assert.doesNotMatch(captured, /monitoring-test-400/);
  console.log("PASS: Sentry initialization, 500 capture, 400 exclusion, credential filtering, local-only transport");
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await Sentry.close(5000);
}
