import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getTableColumns } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createServer } from "node:http";
import { WebSocket } from "ws";

// Dedicated disposable local cluster only; never takes a production URL.
process.env.DATABASE_URL = "postgres://security_test@127.0.0.1:55441/postgres";
delete process.env.REDIS_URL;
const { pool } = await import("../server/db");
const { users, passwordResetTokens } = await import("../shared/schema");
const { issueRecoveryToken, resetPasswordWithToken, hashRecoveryToken } =
  await import("../server/lib/password-recovery");
const { enforceSessionVersion } = await import("../server/lib/session-version");
const { createWsToken, setupWebSocket, broadcastToUser } = await import("../server/lib/websocket");

for (const [name, table] of [["users", users], ["password_reset_tokens", passwordResetTokens]] as const) {
  const columns = Object.values(getTableColumns(table)).map(column =>
    `"${column.name}" ${column.getSQLType()}${column.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : ""}`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${columns.join(",")})`);
}
await pool.query("ALTER TABLE users ALTER COLUMN auth_version SET DEFAULT 0");
const id = crypto.randomUUID();
const oldHash = await bcrypt.hash("old-password", 4);
await pool.query("INSERT INTO users (id, password_hash, auth_version, is_blocked) VALUES ($1,$2,0,false)", [id, oldHash]);
const token = () => crypto.randomBytes(32).toString("hex");
const future = () => new Date(Date.now() + 60000);
const account = async () => (await pool.query("SELECT * FROM users WHERE id=$1", [id])).rows[0];

const first = token(), raw = token();
await issueRecoveryToken(id, first, future());
await issueRecoveryToken(id, raw, future());
assert.equal(await resetPasswordWithToken(first, "new-password"), false);
const stored = (await pool.query("SELECT token FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL", [id])).rows[0].token;
assert.equal(stored, hashRecoveryToken(raw)); assert.notEqual(stored, raw);
const results = await Promise.all([
  resetPasswordWithToken(raw, "password-one"), resetPasswordWithToken(raw, "password-two"),
]);
assert.equal(results.filter(Boolean).length, 1);
assert.equal((await account()).auth_version, 1);
assert.equal(await resetPasswordWithToken(raw, "replay-password"), false);
const expired = token();
await issueRecoveryToken(id, expired, new Date(Date.now() - 1000));
assert.equal(await resetPasswordWithToken(expired, "new-password"), false);
await pool.query("UPDATE users SET is_blocked=true WHERE id=$1", [id]);
assert.equal(await issueRecoveryToken(id, token(), future()), false);
await pool.query("UPDATE users SET is_blocked=false WHERE id=$1", [id]);

// Force failure after password update: both password and version must roll back.
const retry = token(); await issueRecoveryToken(id, retry, future());
const before = await account();
await pool.query(`CREATE OR REPLACE FUNCTION fail_test_token_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
await pool.query("CREATE TRIGGER test_fail_token BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION fail_test_token_update()");
await assert.rejects(resetPasswordWithToken(retry, "rollback-password"));
assert.equal((await account()).password_hash, before.password_hash);
assert.equal((await account()).auth_version, before.auth_version);
await pool.query("DROP TRIGGER test_fail_token ON password_reset_tokens");

async function guard(version: number | undefined) {
  let status = 200, next = false, destroyed = false;
  const req: any = { session: { passport: { user: { claims: { sub: id }, authVersion: version } },
    destroy: (done: any) => { destroyed = true; done(); } } };
  const res: any = { status: (n: number) => { status = n; return res; }, json: () => res, clearCookie: () => res };
  await enforceSessionVersion(req, res, () => { next = true; });
  return { status, next, destroyed };
}
assert.equal((await guard(1)).next, true);
assert.equal((await guard(undefined)).status, 401);

// Real sockets: a reset revokes both an existing connection and an unused ticket.
const server = createServer();
await setupWebSocket(server);
await new Promise<void>(resolve => server.listen(55442, "127.0.0.1", resolve));
const pendingTicket = await createWsToken(id);
const ws = new WebSocket(`ws://127.0.0.1:55442/ws?token=${await createWsToken(id)}`);
await new Promise<void>((resolve, reject) => {
  ws.once("message", () => resolve()); ws.once("error", reject);
});
assert.equal(await resetPasswordWithToken(retry, "final-password"), true);
assert.equal((await guard(1)).status, 401);
assert.equal((await guard(2)).next, true);
const closed = new Promise<number>(resolve => ws.once("close", code => resolve(code)));
let leaked = false; ws.on("message", () => { leaked = true; });
broadcastToUser(id, "private-event", { test: true });
assert.equal(await closed, 4001); assert.equal(leaked, false);
const stale = new WebSocket(`ws://127.0.0.1:55442/ws?token=${pendingTicket}`);
assert.equal(await new Promise<number>(resolve => stale.once("close", resolve)), 4001);
await new Promise<void>(resolve => server.close(() => resolve()));
await pool.query("DELETE FROM password_reset_tokens WHERE user_id=$1", [id]);
await pool.query("DELETE FROM users WHERE id=$1", [id]);
await pool.end();
console.log("PASS real PostgreSQL: hashed tokens, issuance invalidation, concurrent single use, rollback, expiry, blocked user, HTTP/WS revocation");
process.exit(0);
