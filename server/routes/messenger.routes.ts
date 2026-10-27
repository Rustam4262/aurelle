import { Router, type RequestHandler } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { logger } from "../lib/logger";
import { messengerGroups } from "./messenger-groups";
import multer from "multer";
import { prepareMessengerFile, MESSENGER_FILE_LIMIT } from "../lib/messenger-file";

// Inject the database/auth middleware for integration tests against an isolated database.
export function createMessengerRouter(
  database: Pool = pool,
  authenticate: RequestHandler = isAuthenticated,
) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MESSENGER_FILE_LIMIT, files: 1, fields: 2, fieldSize: 16000 },
  }).single("file");
  router.use(authenticate);
  router.use(async (req: any, res, next) => {
    try {
      const r = await database.query(
        "SELECT id FROM users WHERE id=$1 AND is_blocked IS NOT TRUE",
        [req.user.claims.sub],
      );
      if (!r.rowCount) return res.status(403).json({ code: "MESSENGER_ACCESS_DENIED" });
      res.setHeader("Cache-Control", "no-store");
      next();
    } catch (e) {
      next(e);
    }
  });
  const writeLimit = rateLimit({
    windowMs: 60_000,
    limit: 30,
    keyGenerator: (req: any) => req.user.claims.sub,
    message: { code: "MESSENGER_RATE_LIMIT" },
  });
  const wrap =
    (fn: (req: any, res: any) => Promise<any>): RequestHandler =>
    (req, res, next) => {
      void fn(req, res).catch(next);
    };
  router.use(messengerGroups(database, writeLimit));
  const member = async (chat: string, user: string) =>
    (
      await database.query(
        "SELECT 1 FROM messenger_members WHERE conversation_id=$1 AND user_id=$2",
        [chat, user],
      )
    ).rowCount;

  // Directory contains public professionals only; never disclose private client emails or phone numbers.
  router.get(
    "/contacts",
    wrap(async (req, res) => {
      const q = String(req.query.q || "")
        .trim()
        .slice(0, 80);
      const rows = await database.query(
        `SELECT * FROM (
      SELECT 'master' AS kind, m.id, m.user_id AS "userId", m.name, m.photo AS avatar
      FROM masters m JOIN users u ON u.id=m.user_id WHERE m.is_active IS TRUE AND m.status='active' AND u.is_blocked IS NOT TRUE
      UNION ALL
      SELECT 'salon', s.id, s.owner_id, COALESCE(s.name->>$3,s.name->>'ru',s.name->>'en'), s.photos[1]
      FROM salons s JOIN users u ON u.id=s.owner_id WHERE s.is_active IS TRUE AND s.status='active' AND u.is_blocked IS NOT TRUE
    ) d WHERE "userId"<>$1 AND name ILIKE $2 ORDER BY name LIMIT 30`,
        [
          req.user.claims.sub,
          "%" + q.replace(/[\\%_]/g, "\\$&") + "%",
          ["ru", "uz", "en"].includes(req.query.lang) ? req.query.lang : "ru",
        ],
      );
      res.json(rows.rows);
    }),
  );
  router.get(
    "/conversations",
    wrap(async (req, res) => {
      const r = await database.query(
        `SELECT c.id,c.kind,c.title,c.creator_id AS "creatorId",c.updated_at AS "updatedAt",peer.id AS "peerId",
      CASE WHEN c.kind='group' THEN c.title ELSE peer.name END AS name,
      CASE WHEN c.kind='group' THEN NULL ELSE peer.avatar END AS avatar,
      (SELECT count(*)::int FROM messenger_members WHERE conversation_id=c.id) AS "memberCount",
      (SELECT max(x.id) FROM messenger_messages x WHERE x.conversation_id=c.id AND x.sender_id<>$1) AS "lastIncomingId",
      last.body AS preview,last.created_at AS "lastMessageAt",
      (SELECT count(*)::int FROM messenger_messages x WHERE x.conversation_id=c.id AND x.sender_id<>$1 AND x.id>mine.last_read_id) AS unread,
      c.kind='direct' AND EXISTS(SELECT 1 FROM messenger_blocks b WHERE b.user_id=$1 AND b.blocked_user_id=peer.id) AS blocked
      FROM messenger_members mine JOIN messenger_conversations c ON c.id=mine.conversation_id
      LEFT JOIN LATERAL (SELECT u.id,COALESCE(NULLIF(btrim(p.full_name),''),NULLIF(btrim(concat_ws(' ',u.first_name,u.last_name)),''),(SELECT NULLIF(btrim(mp.name),'') FROM masters mp WHERE mp.user_id=u.id AND NULLIF(btrim(mp.name),'') IS NOT NULL ORDER BY mp.id LIMIT 1),'Пользователь') AS name,COALESCE(NULLIF(btrim(p.avatar_url),''),NULLIF(btrim(u.profile_image_url),''),(SELECT NULLIF(btrim(mp.photo),'') FROM masters mp WHERE mp.user_id=u.id AND NULLIF(btrim(mp.photo),'') IS NOT NULL ORDER BY mp.id LIMIT 1)) AS avatar FROM messenger_members other JOIN users u ON u.id=other.user_id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE other.conversation_id=c.id AND other.user_id<>$1 ORDER BY u.id LIMIT 1) peer ON true
      LEFT JOIN LATERAL (SELECT body,created_at FROM messenger_messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) last ON true
      WHERE mine.user_id=$1 ORDER BY c.updated_at DESC,c.id`,
        [req.user.claims.sub],
      );
      res.json(r.rows);
    }),
  );
  router.post(
    "/conversations",
    writeLimit,
    wrap(async (req, res) => {
      const input = z
        .object({ userId: z.string().min(1).max(200) })
        .strict()
        .safeParse(req.body);
      if (!input.success || input.data.userId === req.user.claims.sub)
        return res.status(400).json({ code: "MESSENGER_INVALID" });
      const me = req.user.claims.sub,
        peer = input.data.userId;
      const client = await database.connect();
      try {
        await client.query("BEGIN");
        const exists = await client.query(
          "SELECT id FROM users WHERE id=$1 AND is_blocked IS NOT TRUE",
          [peer],
        );
        if (!exists.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
        }
        const key = JSON.stringify([me, peer].sort());
        const c = await client.query(
          "INSERT INTO messenger_conversations(direct_key) VALUES($1) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id",
          [key],
        );
        const id = c.rows[0].id;
        await client.query(
          "INSERT INTO messenger_members(conversation_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING",
          [id, me, peer],
        );
        await client.query("COMMIT");
        res.json({ id });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }),
  );
  router.get(
    "/conversations/:id/messages",
    wrap(async (req, res) => {
      if (!(await member(req.params.id, req.user.claims.sub)))
        return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
      const parsed = z.coerce
        .number()
        .int()
        .positive()
        .max(2147483647)
        .safeParse(req.query.before ?? 2147483647);
      if (!parsed.success) return res.status(400).json({ code: "MESSENGER_INVALID" });
      const r = await database.query(
        `SELECT m.id, m.sender_id AS "senderId", m.client_id AS "clientId", m.body, m.created_at AS "createdAt", (SELECT COALESCE(NULLIF(btrim(p.full_name),''),NULLIF(btrim(concat_ws(' ',u.first_name,u.last_name)),''),(SELECT NULLIF(btrim(mp.name),'') FROM masters mp WHERE mp.user_id=u.id AND NULLIF(btrim(mp.name),'') IS NOT NULL ORDER BY mp.id LIMIT 1),'Пользователь') FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=m.sender_id) AS "senderName", (SELECT json_build_object('id',a.id,'name',a.name,'contentType',a.content_type,'size',a.size) FROM messenger_attachments a WHERE a.message_id=m.id) AS attachment
      FROM messenger_messages m WHERE m.conversation_id=$1 AND m.id<$2 ORDER BY m.id DESC LIMIT 51`,
        [req.params.id, parsed.data],
      );
      const read = await database.query(
        "SELECT min(last_read_id) AS last_read_id FROM messenger_members WHERE conversation_id=$1 AND user_id<>$2",
        [req.params.id, req.user.claims.sub],
      );
      res.json({
        messages: r.rows.slice(0, 50).reverse(),
        hasMore: r.rows.length > 50,
        peerReadId: read.rows[0]?.last_read_id || 0,
      });
    }),
  );
  router.post(
    "/conversations/:id/messages",
    writeLimit,
    (req: any, res, next) => {
      void member(req.params.id, req.user.claims.sub)
        .then((allowed) => {
          if (!allowed) {
            res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
            return;
          }
          upload(req, res, (error) => {
            if (error) {
              res.status(400).json({ code: "MESSENGER_INVALID_FILE" });
              return;
            }
            next();
          });
        })
        .catch(next);
    },
    wrap(async (req, res) => {
      let attachment: Awaited<ReturnType<typeof prepareMessengerFile>> | undefined;
      if (req.file) {
        try {
          attachment = await prepareMessengerFile(req.file);
        } catch {
          return res.status(400).json({ code: "MESSENGER_INVALID_FILE" });
        }
        if (!req.body.body?.trim()) req.body.body = attachment.name;
      }
      const input = z
        .object({ body: z.string().trim().min(1).max(4000), clientId: z.string().uuid() })
        .strict()
        .safeParse(req.body);
      if (!input.success) return res.status(400).json({ code: "MESSENGER_INVALID" });
      const me = req.user.claims.sub,
        id = req.params.id;
      const client = await database.connect();
      try {
        await client.query("BEGIN");
        // Serialize sends within a conversation so committed message IDs and read cursors remain ordered.
        const lock = await client.query(
          "SELECT c.id FROM messenger_conversations c JOIN messenger_members m ON m.conversation_id=c.id WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c",
          [id, me],
        );
        if (!lock.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
        }
        if (
          !(
            await client.query(
              "SELECT 1 FROM messenger_members WHERE conversation_id=$1 AND user_id=$2",
              [id, me],
            )
          ).rowCount
        ) {
          await client.query("ROLLBACK");
          return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
        }
        const blocked = await client.query(
          `SELECT 1 FROM messenger_members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2 AND (SELECT kind FROM messenger_conversations WHERE id=$1)='direct' AND (u.is_blocked IS TRUE OR EXISTS(SELECT 1 FROM messenger_blocks b WHERE (b.user_id=$2 AND b.blocked_user_id=m.user_id) OR (b.user_id=m.user_id AND b.blocked_user_id=$2)))`,
          [id, me],
        );
        if (blocked.rowCount) {
          await client.query("ROLLBACK");
          return res.status(403).json({ code: "MESSENGER_BLOCKED" });
        }
        const msg = await client.query(
          `INSERT INTO messenger_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)
        ON CONFLICT(conversation_id,sender_id,client_id) DO UPDATE SET client_id=EXCLUDED.client_id
        RETURNING id,(xmax=0) AS inserted,sender_id AS "senderId",client_id AS "clientId",body,created_at AS "createdAt"`,
          [id, me, input.data.clientId, input.data.body],
        );
        if (attachment && msg.rows[0].inserted)
          await client.query(
            "INSERT INTO messenger_attachments(message_id,name,content_type,size,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(message_id) DO NOTHING",
            [
              msg.rows[0].id,
              attachment.name,
              attachment.contentType,
              attachment.data.length,
              attachment.data,
            ],
          );
        await client.query("UPDATE messenger_conversations SET updated_at=now() WHERE id=$1", [id]);
        await client.query("COMMIT");
        res.json(msg.rows[0]);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }),
  );
  router.post(
    "/conversations/:id/read",
    wrap(async (req, res) => {
      if (!(await member(req.params.id, req.user.claims.sub)))
        return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
      const input = z
        .object({ messageId: z.number().int().positive().max(2147483647) })
        .strict()
        .safeParse(req.body);
      if (!input.success) return res.status(400).json({ code: "MESSENGER_INVALID" });
      await database.query(
        `UPDATE messenger_members SET last_read_id=greatest(last_read_id,$3) WHERE conversation_id=$1 AND user_id=$2 AND EXISTS(SELECT 1 FROM messenger_messages WHERE id=$3 AND conversation_id=$1)`,
        [req.params.id, req.user.claims.sub, input.data.messageId],
      );
      res.json({ ok: true });
    }),
  );
  router.get(
    "/attachments/:id",
    wrap(async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) return res.status(404).end();
      const r = await database.query(
        `SELECT a.* FROM messenger_attachments a JOIN messenger_messages m ON m.id=a.message_id JOIN messenger_members p ON p.conversation_id=m.conversation_id WHERE a.id=$1 AND p.user_id=$2`,
        [req.params.id, req.user.claims.sub],
      );
      const a = r.rows[0];
      if (!a) return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
      res.setHeader("Content-Type", a.content_type);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader(
        "Content-Disposition",
        `${a.content_type === "image/webp" ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(a.name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16))}`,
      );
      res.send(a.data);
    }),
  );
  router.put(
    "/conversations/:id/block",
    writeLimit,
    wrap(async (req, res) => {
      if (!(await member(req.params.id, req.user.claims.sub)))
        return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
      const input = z.object({ blocked: z.boolean() }).strict().safeParse(req.body);
      if (!input.success) return res.status(400).json({ code: "MESSENGER_INVALID" });
      if (
        !(
          await database.query(
            "SELECT 1 FROM messenger_conversations WHERE id=$1 AND kind='direct'",
            [req.params.id],
          )
        ).rowCount
      )
        return res.status(400).json({ code: "MESSENGER_INVALID" });
      const peer = (
        await database.query(
          "SELECT user_id FROM messenger_members WHERE conversation_id=$1 AND user_id<>$2",
          [req.params.id, req.user.claims.sub],
        )
      ).rows[0]?.user_id;
      if (input.data.blocked)
        await database.query(
          "INSERT INTO messenger_blocks(user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [req.user.claims.sub, peer],
        );
      else
        await database.query(
          "DELETE FROM messenger_blocks WHERE user_id=$1 AND blocked_user_id=$2",
          [req.user.claims.sub, peer],
        );
      res.json({ ok: true });
    }),
  );
  router.use((error: Error, _req: any, res: any, _next: any) => {
    logger.error("Messenger request failed", error, { source: "messenger" });
    res.status(503).json({ code: "MESSENGER_UNAVAILABLE" });
  });
  return router;
}
export default createMessengerRouter();
