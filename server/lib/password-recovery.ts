import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { passwordResetTokens, users } from "@shared/schema";

export const hashRecoveryToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function issueRecoveryToken(userId: string, rawToken: string, expiresAt: Date) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user || user.isBlocked) return false;
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
    await tx
      .insert(passwordResetTokens)
      .values({ userId, token: hashRecoveryToken(rawToken), expiresAt });
    return true;
  });
}

export async function resetPasswordWithToken(rawToken: string, password: string): Promise<boolean> {
  const digest = hashRecoveryToken(rawToken);
  const validToken = () =>
    and(
      eq(passwordResetTokens.token, digest),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    );
  const [candidate] = await db.select().from(passwordResetTokens).where(validToken()).limit(1);
  if (!candidate) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  return db.transaction(async (tx) => {
    // Same lock ordering as token issuance, including different tokens for one user.
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, candidate.userId))
      .for("update");
    if (!user || user.isBlocked) return false;
    const [token] = await tx.select().from(passwordResetTokens).where(validToken()).for("update");
    if (!token || token.userId !== user.id) return false;
    await tx
      .update(users)
      .set({
        passwordHash,
        authVersion: sql`${users.authVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    return true;
  });
}
