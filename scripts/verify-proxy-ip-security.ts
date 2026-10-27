import assert from "node:assert/strict";
import express from "express";
import { adminIpPolicy } from "../server/lib/admin-ip-policy";
import { getClientIp } from "../server/lib/request-ip";
process.env.DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";
const { db } = await import("../server/db");
const { requireAdminIp } = await import("../server/middleware/adminIp");
(db as any).insert = () => ({ values: async () => [] });
const app = express();
app.set("trust proxy", "loopback");
function request(peer: string, forwarded: string, real = "192.0.2.99"): any {
  const req = Object.create(express.request);
  Object.assign(req, {
    app,
    headers: { "x-forwarded-for": forwarded, "x-real-ip": real },
    method: "GET",
    url: "/api/admin/test",
  });
  Object.defineProperty(req, "socket", { value: { remoteAddress: peer } });
  return req;
}
// Remote client cannot supply its own identity through either header.
assert.equal(getClientIp(request("198.51.100.20", "192.0.2.99")), "198.51.100.20");
// Nginx appending an actual client address also remains safe.
assert.equal(getClientIp(request("127.0.0.1", "192.0.2.99, 198.51.100.20")), "198.51.100.20");
assert.equal(getClientIp(request("::ffff:127.0.0.1", "192.0.2.99")), "192.0.2.99");
assert.equal(getClientIp(request("2001:db8::1", "192.0.2.99")), "2001:db8::1");
assert.equal(adminIpPolicy({ NODE_ENV: "production" }).valid, false);
assert.equal(adminIpPolicy({ ADMIN_IP_RESTRICTION: "true", ADMIN_ALLOWED_IPS: "" }).valid, false);
assert.equal(
  adminIpPolicy({ ADMIN_IP_RESTRICTION: "true", ADMIN_ALLOWED_IPS: "192.0.2.99,garbage" }).valid,
  false,
);
assert.equal(
  adminIpPolicy({ ADMIN_IP_RESTRICTION: "false", NODE_ENV: "production" }).enabled,
  false,
);
assert.equal(adminIpPolicy({ ADMIN_IP_RESTRICTION: "tru", NODE_ENV: "production" }).valid, false);
assert(adminIpPolicy({ ADMIN_ALLOWED_IPS: "::ffff:192.0.2.99" }).allowed.has("192.0.2.99"));
async function check(req: any) {
  let status = 200,
    passed = false;
  const res: any = {
    status: (value: number) => {
      status = value;
      return res;
    },
    json: () => res,
  };
  await requireAdminIp(req, res, () => {
    passed = true;
  });
  return { status, passed };
}
process.env.ADMIN_IP_RESTRICTION = "true";
process.env.ADMIN_ALLOWED_IPS = "192.0.2.99";
assert.equal((await check(request("198.51.100.20", "192.0.2.99"))).status, 403);
assert.equal((await check(request("127.0.0.1", "192.0.2.99, 198.51.100.20"))).status, 403);
assert.equal((await check(request("127.0.0.1", "192.0.2.99"))).passed, true);
process.env.ADMIN_ALLOWED_IPS = "";
assert.equal((await check(request("127.0.0.1", "192.0.2.99"))).status, 503);
process.env.ADMIN_IP_RESTRICTION = "false";
assert.equal((await check(request("198.51.100.20", "192.0.2.99"))).passed, true);
console.log(
  "PASS: direct/proxied header spoofing, audit IP, IPv4/IPv6, admin allowlist and fail-closed configuration",
);
process.exit(0);
