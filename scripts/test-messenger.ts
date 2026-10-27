import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import express from "express";
import pg from "pg";

// Dedicated local PostgreSQL cluster only. Never load the application's .env here.
process.env.DATABASE_URL = "postgres://messenger_test@127.0.0.1:55439/postgres";
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=messenger_test",
});
await db.query("CREATE SCHEMA IF NOT EXISTS messenger_test");
await db.query(`CREATE TABLE IF NOT EXISTS users(id varchar PRIMARY KEY, first_name text,last_name text,profile_image_url text,is_blocked boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS user_profiles(user_id varchar PRIMARY KEY,full_name text,avatar_url text);
CREATE TABLE IF NOT EXISTS masters(id varchar PRIMARY KEY,user_id varchar,name text,photo text,is_active boolean,status text);
CREATE TABLE IF NOT EXISTS salons(id varchar PRIMARY KEY,owner_id varchar,name jsonb,photos text[],is_active boolean,status text);`);
const installed = await db.query(
  "SELECT to_regclass('messenger_test.messenger_conversations') AS installed",
);
if (!installed.rows[0].installed)
  await db.query(readFileSync("migrations/0039_messenger.sql", "utf8"));
const filesInstalled = await db.query(
  "SELECT to_regclass('messenger_test.messenger_attachments') AS installed",
);
if (!filesInstalled.rows[0].installed)
  await db.query(readFileSync("migrations/0040_messenger_attachments.sql", "utf8"));
const groupsInstalled = await db.query(
  "SELECT 1 FROM information_schema.columns WHERE table_schema='messenger_test' AND table_name='messenger_conversations' AND column_name='kind'",
);
if (!groupsInstalled.rowCount)
  await db.query(readFileSync("migrations/0041_messenger_groups.sql", "utf8"));
await db.query(`INSERT INTO users(id,first_name) VALUES('alice','Алина'),('bob','Малика'),('eve','Другой пользователь'),('owner','Владелец') ON CONFLICT DO NOTHING;
INSERT INTO masters(id,user_id,name,is_active,status) VALUES('master-bob','bob','Малика',true,'active') ON CONFLICT DO NOTHING;
INSERT INTO salons(id,owner_id,name,is_active,status) VALUES('salon-owner','owner','{"ru":"Салон AURELLE"}',true,'active') ON CONFLICT DO NOTHING;`);
const { createMessengerRouter } = await import("../server/routes/messenger.routes");
const { verifyCsrf } = await import("../server/middleware/csrf");
const app = express();
app.use(express.json());
const auth: express.RequestHandler = (req: any, res, next) => {
  const id = req.headers["x-test-user"] || req.headers.cookie?.match(/testUser=([^;]+)/)?.[1];
  if (!id) return res.status(401).json({ error: "Unauthorized" });
  req.user = { claims: { sub: id } };
  next();
};
app.get("/api/auth/user", auth, (req: any, res) =>
  res.json({ id: req.user.claims.sub, role: req.user.claims.sub === "bob" ? "master" : "client" }),
);
app.use("/api/messenger", verifyCsrf, createMessengerRouter(db, auth));
app.use("/api", (_req, res) => res.json([]));
if (process.argv.includes("--serve")) {
  app.use(express.static("dist/public"));
  app.get("*", (_req, res) => res.sendFile("index.html", { root: "dist/public" }));
  app.listen(55440, "127.0.0.1", () =>
    console.log("Local messenger test UI: http://127.0.0.1:55440/messenger"),
  );
} else {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const port = (server.address() as any).port;
  async function call(user: string, path: string, method = "GET", body?: unknown) {
    const r = await fetch(`http://127.0.0.1:${port}/api/messenger${path}`, {
      method,
      headers: {
        "x-test-user": user,
        "Content-Type": "application/json",
        Cookie: "csrf-token=test",
        "X-CSRF-Token": "test",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    assert.equal((await call("", "/conversations")).status, 401);
    const csrf = await fetch(`http://127.0.0.1:${port}/api/messenger/conversations`, {
      method: "POST",
      headers: { "x-test-user": "alice", "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "bob" }),
    });
    assert.equal(csrf.status, 403);
    const pair = await Promise.all([
      call("alice", "/conversations", "POST", { userId: "bob" }),
      call("bob", "/conversations", "POST", { userId: "alice" }),
    ]);
    assert.equal(pair[0].status, 200);
    const id = pair[0].data.id;
    assert.equal(id, pair[1].data.id);
    const p = "/conversations/" + id;
    await db.query("UPDATE users SET first_name='',profile_image_url='' WHERE id='bob'");
    await db.query("INSERT INTO user_profiles(user_id,full_name,avatar_url) VALUES('bob','','') ON CONFLICT(user_id) DO UPDATE SET full_name='',avatar_url=''");
    await db.query("UPDATE masters SET photo='/test-master-avatar.webp' WHERE id='master-bob'");
    const identity = (await call("alice", "/conversations")).data.find((x: any) => x.id === id);
    assert.equal(identity.name, "Малика");
    assert.equal(identity.avatar, "/test-master-avatar.webp");
    console.log("PASS professional identity fallback with blank account fields");
    await call("alice", p + "/block", "PUT", { blocked: false });
    await call("bob", p + "/block", "PUT", { blocked: false });
    assert.equal((await call("eve", p + "/messages")).status, 404);
    assert.equal(
      (await call("eve", p + "/messages", "POST", { body: "intruder", clientId: randomUUID() }))
        .status,
      404,
    );
    assert.equal((await call("eve", p + "/read", "POST", { messageId: 1 })).status, 404);
    const payload = { body: "Привет, Малика! " + randomUUID(), clientId: randomUUID() };
    const sends = await Promise.all([
      call("alice", p + "/messages", "POST", payload),
      call("alice", p + "/messages", "POST", payload),
    ]);
    assert.equal(sends[0].status, 200);
    assert.equal(sends[0].data.id, sends[1].data.id);
    const latest = await call("bob", p + "/messages");
    assert.ok(latest.data.messages.some((m: any) => m.body === payload.body));
    assert.ok((await call("bob", "/conversations")).data.find((c: any) => c.id === id).unread > 0);
    await call("bob", p + "/read", "POST", { messageId: sends[0].data.id });
    assert.equal(
      (await call("bob", "/conversations")).data.find((c: any) => c.id === id).unread,
      0,
    );
    assert.equal((await call("alice", p + "/messages")).data.peerReadId, sends[0].data.id);
    assert.equal(
      (await call("alice", p + "/messages", "POST", { body: "   ", clientId: randomUUID() }))
        .status,
      400,
    );
    await call("bob", p + "/block", "PUT", { blocked: true });
    assert.equal(
      (await call("alice", p + "/messages", "POST", { body: "blocked", clientId: randomUUID() }))
        .status,
      403,
    );
    await call("bob", p + "/block", "PUT", { blocked: false });
    const contacts = await call("alice", "/contacts?q=Малика");
    assert.equal(contacts.status, 200);
    assert.equal(contacts.data[0].userId, "bob");
    assert.ok(!JSON.stringify(contacts.data).includes("email"));
    for (let i = 0; i < 55; i++)
      await db.query(
        "INSERT INTO messenger_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)",
        [id, "bob", randomUUID(), "История " + i],
      );
    const first = await call("alice", p + "/messages");
    assert.equal(first.data.messages.length, 50);
    assert.equal(first.data.hasMore, true);
    const older = await call("alice", p + "/messages?before=" + first.data.messages[0].id);
    assert.ok(older.data.messages.every((m: any) => m.id < first.data.messages[0].id));
    const sharp = (await import("sharp")).default;
    const image = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#ed2972" },
    })
      .png()
      .toBuffer();
    async function uploadFile(
      user: string,
      buffer: Buffer,
      name: string,
      type: string,
      nonce = randomUUID(),
    ) {
      const form = new FormData();
      form.append("clientId", nonce);
      form.append("body", "");
      form.append("file", new Blob([new Uint8Array(buffer)], { type }), name);
      const r = await fetch(`http://127.0.0.1:${port}/api/messenger${p}/messages`, {
        method: "POST",
        headers: { "x-test-user": user, Cookie: "csrf-token=test", "X-CSRF-Token": "test" },
        body: form,
      });
      return { status: r.status, data: await r.json() };
    }
    const nonce = randomUUID();
    const uploaded = await uploadFile("alice", image, "Фото мастера.png", "image/png", nonce);
    assert.equal(uploaded.status, 200);
    assert.equal(
      (await uploadFile("alice", image, "Фото мастера.png", "image/png", nonce)).data.id,
      uploaded.data.id,
    );
    const withFiles = await call("bob", p + "/messages");
    const file = withFiles.data.messages.find((m: any) => m.id === uploaded.data.id).attachment;
    assert.equal(file.contentType, "image/webp");
    assert.equal(file.name, "Фото мастера.webp");
    const fileUrl = `http://127.0.0.1:${port}/api/messenger/attachments/${file.id}`;
    const download = await fetch(fileUrl, { headers: { "x-test-user": "bob" } });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("cache-control"), "no-store");
    const decoded = await sharp(Buffer.from(await download.arrayBuffer())).metadata();
    assert.equal(decoded.format, "webp");
    assert.equal(decoded.exif, undefined);
    assert.equal((await fetch(fileUrl, { headers: { "x-test-user": "eve" } })).status, 404);
    assert.equal((await fetch(fileUrl)).status, 401);
    assert.equal((await uploadFile("eve", image, "photo.png", "image/png")).status, 404);
    assert.equal(
      (await uploadFile("alice", Buffer.from("<html>unsafe</html>"), "photo.png", "image/png"))
        .status,
      400,
    );
    assert.equal(
      (await uploadFile("alice", Buffer.alloc(8388609), "big.pdf", "application/pdf")).status,
      400,
    );
    const pdf = await uploadFile(
      "alice",
      Buffer.from("%PDF-1.4\n%%EOF"),
      "document.pdf",
      "application/pdf",
    );
    assert.equal(pdf.status, 200);
    const pdfFile = (await call("bob", p + "/messages")).data.messages.find(
      (m: any) => m.id === pdf.data.id,
    ).attachment;
    const pdfResponse = await fetch(
      `http://127.0.0.1:${port}/api/messenger/attachments/${pdfFile.id}`,
      { headers: { "x-test-user": "bob" } },
    );
    assert.ok(pdfResponse.headers.get("content-disposition")?.startsWith("attachment;"));
    console.log(
      "PASS attachments: image normalization, private downloads, PDF disposition, oversized/spoofed files rejected, retries deduplicated",
    );
    const g = await call("alice", "/groups", "POST", { title: "Команда салона", userIds: ["bob"] });
    assert.equal(g.status, 200);
    const gid = g.data.id;
    assert.equal(
      (await call("alice", "/conversations")).data.filter((c: any) => c.id === gid).length,
      1,
    );
    assert.equal((await call("eve", "/groups/" + gid + "/members")).status, 404);
    assert.equal(
      (await call("bob", "/groups/" + gid + "/members", "POST", { userId: "eve" })).status,
      403,
    );
    assert.equal(
      (await call("alice", "/groups/" + gid + "/members", "POST", { userId: "eve" })).status,
      200,
    );
    const gm = await call("bob", "/conversations/" + gid + "/messages", "POST", {
      body: "Всем привет",
      clientId: randomUUID(),
    });
    assert.equal(gm.status, 200);
    const gf=(await db.query('INSERT INTO messenger_attachments(message_id,name,content_type,size,data) SELECT $1,name,content_type,size,data FROM messenger_attachments WHERE id=$2 RETURNING id',[gm.data.id,file.id])).rows[0].id;
    const groupFileUrl=`http://127.0.0.1:${port}/api/messenger/attachments/${gf}`;
    assert.equal((await fetch(groupFileUrl,{headers:{'x-test-user':'eve'}})).status,200);
    const gh = await call("eve", "/conversations/" + gid + "/messages");
    assert.equal(gh.status, 200);
    assert.equal(gh.data.messages[0].senderName, "Малика");
    assert.equal(
      (await call("bob", "/groups/" + gid, "PATCH", { title: "Unauthorized" })).status,
      403,
    );
    assert.equal(
      (await call("alice", "/groups/" + gid, "PATCH", { title: "Наша команда" })).status,
      200,
    );
    assert.equal((await call("alice", "/groups/" + gid + "/members/eve", "DELETE")).status, 200);
    assert.equal((await call("eve", "/conversations/" + gid + "/messages")).status, 404);
    assert.equal((await fetch(groupFileUrl,{headers:{'x-test-user':'eve'}})).status,404);
    assert.equal(
      (
        await call("eve", "/conversations/" + gid + "/messages", "POST", {
          body: "Removed",
          clientId: randomUUID(),
        })
      ).status,
      404,
    );
    assert.equal((await call("bob", "/groups/" + gid + "/members/bob", "DELETE")).status, 200);
    assert.equal(
      (await call("alice", "/conversations")).data.find((c: any) => c.id === gid).memberCount,
      1,
    );
    assert.equal(
      (await call("alice", "/conversations/" + gid + "/block", "PUT", { blocked: true })).status,
      400,
    );
    console.log(
      "PASS groups: create, unique list entry, member-only access, creator-only administration, rename, join/remove/leave, revoked access",
    );
    console.log(
      "PASS: real PostgreSQL migration, concurrent chat creation, participant isolation, CSRF, retry deduplication, unread/read cursors, blocking, private contact data, history pagination",
    );
  } finally {
    server.close();
    await db.end();
    const { pool } = await import("../server/db");
    await pool.end();
  }
}
