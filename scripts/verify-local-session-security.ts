import assert from "node:assert/strict";
import bcrypt from "bcrypt";
process.env.DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";
const { db } = await import("../server/db");
const { setupLocalAuth } = await import("../server/localAuth");
const { isAuthenticated } = await import("../server/auth");
const hash = await bcrypt.hash("test-password", 4);
let user: any = { id: "test", email: "test@example.com", passwordHash: hash, isBlocked: false };
let lookupFails = false;
(db as any).select = () => ({
  from: () => ({
    where: () => ({
      limit: async () => {
        if (lookupFails) throw Error("test database failure");
        return user ? [user] : [];
      },
    }),
  }),
});
const routes = new Map<string, any>();
const app: any = {};
for (const method of ["post", "get", "patch", "put", "delete"])
  app[method] = (path: string, ...handlers: any[]) =>
    routes.set(`${method} ${path}`, handlers.at(-1));
setupLocalAuth(app);
async function login(password: string, regenerationFails = false) {
  let status = 200,
    regenerated = false,
    saved = false;
  const req: any = {
    body: { email: "test@example.com", password },
    session: {
      passport: { user: { claims: { sub: "old-session" } } },
      regenerate: (callback: any) => {
        if (regenerationFails) return callback(Error("test regeneration failure"));
        regenerated = true;
        req.session = {
          save: () => {
            saved = true;
            assert(regenerated);
          },
        };
        callback();
      },
    },
  };
  const res: any = {
    status: (n: number) => {
      status = n;
      return res;
    },
    json: () => res,
  };
  await routes.get("post /api/auth/login")(req, res);
  return { status, regenerated, saved, req };
}
let r = await login("test-password");
assert(r.regenerated && r.saved);
assert.equal(r.req.session.passport.user.claims.sub, "test");
r = await login("wrong");
assert.equal(r.status, 401);
assert(!r.regenerated);
user.isBlocked = true;
r = await login("wrong");
assert.equal(r.status, 401);
r = await login("test-password");
assert.equal(r.status, 403);
assert(!r.regenerated);
user.isBlocked = false;
r = await login("test-password", true);
assert.equal(r.status, 500);
assert(!r.saved);
async function guard() {
  let status = 200,
    nextCalled = false,
    destroyed = false;
  const req: any = {
    session: {
      passport: { user: { claims: { sub: "test" } } },
      destroy: () => {
        destroyed = true;
      },
    },
  };
  const res: any = {
    status: (n: number) => {
      status = n;
      return res;
    },
    json: () => res,
    clearCookie: () => res,
  };
  await isAuthenticated(req, res, () => {
    nextCalled = true;
  });
  return { status, nextCalled, destroyed };
}
assert.equal((await guard()).nextCalled, true);
user.isBlocked = true;
const blocked = await guard();
assert.equal(blocked.status, 401);
assert(blocked.destroyed);
assert(!blocked.nextCalled);
lookupFails = true;
const unavailable = await guard();
assert.equal(unavailable.status, 503);
assert(!unavailable.nextCalled);
lookupFails = false;
user = null;
let transactionUsed = false,
  profileWritten = false;
(db as any).transaction = async (fn: any) => {
  transactionUsed = true;
  return fn({
    insert: () => ({
      values: (data: any) => {
        if ("userId" in data) {
          profileWritten = true;
          throw Error("test profile insertion failure");
        }
        return { returning: async () => [{ id: data.id, email: data.email }] };
      },
    }),
  });
};
let registerStatus = 200;
const registerRes: any = {
  status: (n: number) => {
    registerStatus = n;
    return registerRes;
  },
  json: () => registerRes,
};
await routes.get("post /api/auth/register")(
  {
    body: { email: "new@example.com", password: "test-password", role: "client" },
    session: { regenerate: () => assert.fail("No session on transaction failure") },
  },
  registerRes,
);
assert(transactionUsed && profileWritten);
assert.equal(registerStatus, 500);
for (const password of ["a".repeat(73), "я".repeat(37)]) {
  registerStatus = 200;
  await routes.get("post /api/auth/confirm-password-reset")({
    body: { token: "a".repeat(64), newPassword: password },
  }, registerRes);
  assert.equal(registerStatus, 400);
}
console.log(
  "PASS: session replacement, blocked login/session rejection, regeneration and database failures",
);
process.exit(0);
