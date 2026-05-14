import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, passwordResetTokens, emailVerificationTokens } from "@shared/schema";
import { userProfiles } from "@shared/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { loginLimiter, resetLimiter, registerLimiter } from "./middleware/rateLimiter";
import { logger } from "./lib/logger";
import { trackUserLogin } from "./middleware/activity";
import { trackEvent } from "./lib/analytics";
import { getEmailConfigStatus, sendPasswordResetEmail, sendEmailVerificationEmail } from "./email";
import { isSoftDeletedUser } from "./lib/user-deletion";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["client", "owner", "solo_master"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  token: z.string().length(64),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Увеличенные rounds для bcrypt (безопаснее)
const BCRYPT_ROUNDS = 12;

export function setupLocalAuth(app: Express) {
  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email, password, firstName, lastName, role } = parsed.data;
      logger.info(`Registration attempt for email: ${email}`, { source: "localAuth" });

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = `local:${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          email,
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      await db.insert(userProfiles).values({
        userId: newUser.id,
        role,
        fullName: [firstName, lastName].filter(Boolean).join(" ") || null,
      });

      logger.info(`User created with ID: ${newUser.id}`, { source: "localAuth" });

      (req.session as any).passport = {
        user: {
          claims: {
            sub: newUser.id,
            email: newUser.email,
            first_name: newUser.firstName,
            last_name: newUser.lastName,
            profile_image_url: newUser.profileImageUrl,
            role,
          },
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
        },
      };

      req.session.save((err) => {
        if (err) {
          logger.error("Session save error", err as Error, { source: "localAuth" });
          return res.status(500).json({ message: "Failed to create session" });
        }

        // Track user registration/login activity
        trackUserLogin(newUser.id, req);

        // Track product analytics event (fire-and-forget)
        trackEvent({ eventName: "registration_complete", userId: newUser.id, req });

        // Send email verification (fire-and-forget — never blocks registration)
        sendVerificationEmail(newUser.id, email).catch((e) =>
          logger.error("Failed to send verification email", e as Error, { source: "localAuth" }),
        );

        res.json({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role,
          },
        });
      });
    } catch (error: any) {
      logger.error("Registration critical error", error as Error, { source: "localAuth" });
      res.status(500).json({
        message: "Registration failed",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email, password } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (isSoftDeletedUser(user)) {
        return res.status(403).json({ message: "Account removed by administrator" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).passport = {
        user: {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
        },
      };

      req.session.save((err) => {
        if (err) {
          logger.error("Session save error", err as Error, { source: "localAuth" });
          return res.status(500).json({ message: "Failed to create session" });
        }

        // Track user login activity
        trackUserLogin(user.id, req);

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      });
    } catch (error) {
      logger.error("Login error", error as Error, { source: "localAuth" });
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Request password reset - generates token and sends email
  app.post("/api/auth/request-password-reset", resetLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = requestResetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email } = parsed.data;
      const emailStatus = getEmailConfigStatus();

      if (!emailStatus.enabled) {
        logger.warn("Password reset requested while email is disabled", {
          source: "localAuth",
          meta: { reason: emailStatus.reason },
        });
        return res.status(503).json({
          success: false,
          code: "EMAIL_SERVICE_UNAVAILABLE",
          message: "Password reset email is temporarily unavailable",
        });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      // Always return success to prevent email enumeration
      if (!user || isSoftDeletedUser(user)) {
        return res.json({
          success: true,
          message: "If this email exists, you will receive password reset instructions",
        });
      }

      // Generate secure random token
      const token = crypto.randomBytes(32).toString("hex"); // 64 hex chars
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const resetLink = `${process.env.APP_URL || "http://localhost:5000"}/auth/reset-password?token=${token}`;

      // Only report success after the reset email is actually accepted by SMTP.
      const sent = await sendPasswordResetEmail(email, resetLink);
      if (!sent) {
        logger.error("Failed to send password reset email", undefined, {
          source: "localAuth",
          meta: { userId: user.id },
        });
        return res.status(503).json({
          success: false,
          code: "RESET_EMAIL_DELIVERY_FAILED",
          message: "Failed to send password reset email",
        });
      }

      // In development, include token in response for easy testing
      const devResponse = process.env.NODE_ENV !== "production" ? { token, resetLink } : {};

      res.json({
        success: true,
        message: "If this email exists, you will receive password reset instructions",
        ...devResponse,
      });
    } catch (error) {
      logger.error("Password reset request error", error as Error, { source: "localAuth" });
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  // Confirm password reset with token
  app.post("/api/auth/confirm-password-reset", resetLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = confirmResetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { token, newPassword } = parsed.data;

      // Find valid token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt),
          ),
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({
          message: "Invalid or expired reset token",
        });
      }

      const [resetUser] = await db.select().from(users).where(eq(users.id, resetToken.userId)).limit(1);
      if (!resetUser || isSoftDeletedUser(resetUser)) {
        return res.status(403).json({ message: "Account removed by administrator" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update user password
      await db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      logger.error("Password reset confirmation error", error as Error, { source: "localAuth" });
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Verify email with token
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string" || token.length !== 64) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    try {
      const [record] = await db
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.token, token),
            gt(emailVerificationTokens.expiresAt, new Date()),
            isNull(emailVerificationTokens.usedAt),
          ),
        )
        .limit(1);

      if (!record) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      await Promise.all([
        db.update(users).set({ emailVerified: true }).where(eq(users.id, record.userId)),
        db
          .update(emailVerificationTokens)
          .set({ usedAt: new Date() })
          .where(eq(emailVerificationTokens.id, record.id)),
      ]);

      logger.info("Email verified", { source: "localAuth", meta: { userId: record.userId } });

      // Redirect to profile with success indicator
      return res.redirect("/?emailVerified=1");
    } catch (error) {
      logger.error("Email verification error", error as Error, { source: "localAuth" });
      return res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Resend verification email (rate-limited)
  app.post("/api/auth/resend-verification", resetLimiter, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email required" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      // Always return success to prevent email enumeration
      if (!user || user.emailVerified) {
        return res.json({ success: true, message: "If eligible, a verification email has been sent" });
      }

      await sendVerificationEmail(user.id, email);

      res.json({ success: true, message: "If eligible, a verification email has been sent" });
    } catch (error) {
      logger.error("Resend verification error", error as Error, { source: "localAuth" });
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  logger.info("Local auth (login/password) configured successfully", { source: "localAuth" });
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex"); // 64 hex chars
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokens).values({ userId, token, expiresAt });

  const verifyLink = `${process.env.APP_URL || "http://localhost:5000"}/api/auth/verify-email?token=${token}`;

  const ok = await sendEmailVerificationEmail(email, verifyLink);
  logger.info("Verification email dispatched", {
    source: "localAuth",
    meta: { userId, email, sent: ok },
  });
}
