import { Router, type RequestHandler } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

export function messengerGroups(db: Pool, limit: RequestHandler) {
  const r = Router();
  const wrap =
    (fn: (req: any, res: any) => Promise<any>): RequestHandler =>
    (req, res, next) => {
      void fn(req, res).catch(next);
    };
  async function validMembers(tx: PoolClient, ids: string[], actor: string) {
    const users = await tx.query(
      "SELECT id FROM users WHERE id=ANY($1::varchar[]) AND is_blocked IS NOT TRUE",
      [ids],
    );
    const blocked = await tx.query(
      "SELECT 1 FROM messenger_blocks WHERE (user_id=$1 AND blocked_user_id=ANY($2::varchar[])) OR (blocked_user_id=$1 AND user_id=ANY($2::varchar[]))",
      [actor, ids],
    );
    return users.rowCount === ids.length && !blocked.rowCount;
  }
  r.post(
    "/groups",
    limit,
    wrap(async (req, res) => {
      const input = z
        .object({
          title: z.string().trim().min(1).max(100),
          userIds: z.array(z.string().min(1).max(200)).min(1).max(19),
        })
        .strict()
        .safeParse(req.body);
      if (!input.success) return res.status(400).json({ code: "MESSENGER_INVALID" });
      const me = req.user.claims.sub;
      const ids = Array.from(new Set([me, ...input.data.userIds]));
      if (ids.length < 2) return res.status(400).json({ code: "MESSENGER_INVALID" });
      const tx = await db.connect();
      try {
        await tx.query("BEGIN");
        if (!(await validMembers(tx, ids, me))) {
          await tx.query("ROLLBACK");
          return res.status(400).json({ code: "MESSENGER_INVALID_MEMBERS" });
        }
        const group = (
          await tx.query(
            "INSERT INTO messenger_conversations(kind,title,creator_id) VALUES('group',$1,$2) RETURNING id",
            [input.data.title, me],
          )
        ).rows[0];
        await tx.query(
          "INSERT INTO messenger_members(conversation_id,user_id) SELECT $1,unnest($2::varchar[])",
          [group.id, ids],
        );
        await tx.query("COMMIT");
        res.json(group);
      } catch (e) {
        await tx.query("ROLLBACK");
        throw e;
      } finally {
        tx.release();
      }
    }),
  );
  r.get(
    "/groups/:id/members",
    wrap(async (req, res) => {
      const allowed = await db.query(
        "SELECT 1 FROM messenger_members m JOIN messenger_conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.kind='group' AND m.user_id=$2",
        [req.params.id, req.user.claims.sub],
      );
      if (!allowed.rowCount) return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
      const members = await db.query(
        `SELECT u.id,COALESCE(NULLIF(btrim(p.full_name),''),NULLIF(btrim(concat_ws(' ',u.first_name,u.last_name)),''),(SELECT NULLIF(btrim(mp.name),'') FROM masters mp WHERE mp.user_id=u.id AND NULLIF(btrim(mp.name),'') IS NOT NULL ORDER BY mp.id LIMIT 1),'Пользователь') AS name,COALESCE(NULLIF(btrim(p.avatar_url),''),NULLIF(btrim(u.profile_image_url),''),(SELECT NULLIF(btrim(mp.photo),'') FROM masters mp WHERE mp.user_id=u.id AND NULLIF(btrim(mp.photo),'') IS NOT NULL ORDER BY mp.id LIMIT 1)) AS avatar FROM messenger_members m JOIN users u ON u.id=m.user_id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE m.conversation_id=$1 ORDER BY name,u.id`,
        [req.params.id],
      );
      res.json(members.rows);
    }),
  );
  // All membership mutations lock the conversation, like message sends.
  const change = (action: "add" | "remove" | "title") =>
    wrap(async (req, res) => {
      const me = req.user.claims.sub,
        id = req.params.id,
        tx = await db.connect();
      try {
        await tx.query("BEGIN");
        const group = (
          await tx.query(
            "SELECT * FROM messenger_conversations WHERE id=$1 AND kind='group' FOR UPDATE",
            [id],
          )
        ).rows[0];
        const member = await tx.query(
          "SELECT 1 FROM messenger_members WHERE conversation_id=$1 AND user_id=$2",
          [id, me],
        );
        if (!group || !member.rowCount) {
          await tx.query("ROLLBACK");
          return res.status(404).json({ code: "MESSENGER_NOT_FOUND" });
        }
        if (group.creator_id !== me && !(action === "remove" && req.params.userId === me)) {
          await tx.query("ROLLBACK");
          return res.status(403).json({ code: "MESSENGER_ACCESS_DENIED" });
        }
        if (action === "add") {
          const parsed = z
            .object({ userId: z.string().min(1).max(200) })
            .strict()
            .safeParse(req.body);
          const count = Number(
            (
              await tx.query("SELECT count(*) FROM messenger_members WHERE conversation_id=$1", [
                id,
              ])
            ).rows[0].count,
          );
          if (
            !parsed.success ||
            count >= 20 ||
            !(await validMembers(tx, [parsed.data.userId], me))
          ) {
            await tx.query("ROLLBACK");
            return res.status(400).json({ code: "MESSENGER_INVALID_MEMBERS" });
          }
          await tx.query(
            "INSERT INTO messenger_members(conversation_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [id, parsed.data.userId],
          );
        } else if (action === "remove") {
          if (req.params.userId === group.creator_id) {
            await tx.query("ROLLBACK");
            return res.status(400).json({ code: "MESSENGER_GROUP_OWNER" });
          }
          await tx.query("DELETE FROM messenger_members WHERE conversation_id=$1 AND user_id=$2", [
            id,
            req.params.userId,
          ]);
        } else {
          const parsed = z
            .object({ title: z.string().trim().min(1).max(100) })
            .strict()
            .safeParse(req.body);
          if (!parsed.success) {
            await tx.query("ROLLBACK");
            return res.status(400).json({ code: "MESSENGER_INVALID" });
          }
          await tx.query("UPDATE messenger_conversations SET title=$2 WHERE id=$1", [
            id,
            parsed.data.title,
          ]);
        }
        await tx.query("UPDATE messenger_conversations SET updated_at=now() WHERE id=$1", [id]);
        await tx.query("COMMIT");
        res.json({ ok: true });
      } catch (e) {
        await tx.query("ROLLBACK");
        throw e;
      } finally {
        tx.release();
      }
    });
  r.post("/groups/:id/members", limit, change("add"));
  r.delete("/groups/:id/members/:userId", limit, change("remove"));
  r.patch("/groups/:id", limit, change("title"));
  return r;
}
