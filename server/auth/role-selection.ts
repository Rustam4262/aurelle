import type { Request, Response } from "express";
import { db } from "../db";
import { users, userProfiles } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
const choice = z.object({ role: z.enum(["client", "owner", "solo_master"]) }).strict();
export async function completeRoleSelection(req: Request, res: Response) {
  const parsed = choice.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Choose a valid role" });
  const userId = (req as any).user.claims.sub;
  try {
    const selected = await db.transaction(async (tx) => {
      // Atomically consume the one-time choice; existing accounts cannot change roles here.
      const [account] = await tx
        .update(users)
        .set({ roleSelectionRequired: false, updatedAt: new Date() })
        .where(
          and(
            eq(users.id, userId),
            eq(users.roleSelectionRequired, true),
            eq(users.isBlocked, false),
          ),
        )
        .returning({ id: users.id });
      if (!account) return false;
      await tx
        .insert(userProfiles)
        .values({ userId, role: parsed.data.role })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { role: parsed.data.role, updatedAt: new Date() },
        });
      return true;
    });
    if (!selected) return res.status(409).json({ message: "Role already selected" });
    return res.json({
      redirect:
        parsed.data.role === "owner"
          ? "/owner"
          : parsed.data.role === "solo_master"
            ? "/solo-master/onboarding"
            : "/client",
    });
  } catch {
    return res.status(500).json({ message: "Unable to save role" });
  }
}
