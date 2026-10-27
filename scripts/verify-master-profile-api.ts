import "dotenv/config";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "../server/db";
import { masters, userProfiles } from "../shared/schema";
import router from "../server/routes/masters.routes";
const originalSelect = db.select,
  originalTransaction = db.transaction;
let role = "master";
let changes: any[] = [];
const dialect = new PgDialect();
try {
  (db as any).select = () => ({
    from(table: any) {
      const chain: any = {
        where: () =>
          Promise.resolve(
            table === userProfiles
              ? [{ id: "profile-a", userId: "user-a", role }]
              : [{ id: "master-a", userId: "user-a" }],
          ),
      };
      return chain;
    },
  });
  (db as any).transaction = async (fn: any) =>
    fn({
      update(table: any) {
        return {
          set(data: any) {
            return {
              where(condition: any) {
                const query = dialect.sqlToQuery(condition);
                changes.push({ table, data, query });
                return {
                  returning: async () => [{ id: "master-a", ...data }],
                  then: (resolve: any) => Promise.resolve([]).then(resolve),
                };
              },
            };
          },
        };
      },
    });
  const layer = (router as any).stack.find((s: any) => s.route?.path === "/profile");
  const handler = layer.route.stack.at(-1).handle;
  async function request(body: any) {
    let status = 200;
    let data: any;
    await handler(
      { user: { claims: { sub: "user-a" } }, body },
      {
        status: (s: number) => {
          status = s;
          return { json: (d: any) => (data = d) };
        },
        json: (d: any) => (data = d),
      },
    );
    return { status, data };
  }
  const payload = {
    name: "Malika",
    phone: "",
    photo: null,
    experience: 3,
    bio: { ru: "Мастер", uz: "", en: "" },
  };
  assert.equal((await request(payload)).status, 200);
  assert.equal(changes.length, 2);
  assert.ok(changes[0].query.params.includes("master-a"));
  assert.ok(changes[0].query.params.includes("user-a"));
  assert.equal(changes[1].data.fullName, "Malika");
  changes = [];
  assert.equal((await request({ ...payload, id: "another-master", role: "admin" })).status, 400);
  assert.equal(changes.length, 0);
  assert.equal((await request({ ...payload, experience: -1 })).status, 400);
  role = "client";
  assert.equal((await request(payload)).status, 403);
  assert.equal(changes.length, 0);
  console.log("PASS role guard, strict payload, owner-scoped updates and transaction");
} finally {
  db.select = originalSelect;
  db.transaction = originalTransaction;
}
process.exit(0);
