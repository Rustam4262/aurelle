import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { authLimiter, registerLimiter } from "./middleware/rateLimiter";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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

      const { email, password, firstName, lastName } = parsed.data;
      console.log(`[Registration] Attempt for email: ${email}`);

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

      console.log(`[Registration] User created with ID: ${newUser.id}`);

      (req.session as any).passport = {
        user: {
          claims: {
            sub: newUser.id,
            email: newUser.email,
            first_name: newUser.firstName,
            last_name: newUser.lastName,
            profile_image_url: newUser.profileImageUrl,
          },
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
        },
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          },
        });
      });
    } catch (error: any) {
      console.error("[Registration] Critical error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
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
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
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
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Request password reset - generates token and sends email
  app.post("/api/auth/request-password-reset", authLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = requestResetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { email } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      // Always return success to prevent email enumeration
      if (!user) {
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

      // TODO: Send email with reset link
      // For now, log the reset link (in production, send via email)
      const resetLink = `${process.env.APP_URL || "http://localhost:5000"}/auth/reset-password?token=${token}`;
      console.log(`[Password Reset] Link for ${email}: ${resetLink}`);

      // In development, include token in response (REMOVE IN PRODUCTION)
      const devResponse = process.env.NODE_ENV !== "production" ? { token, resetLink } : {};

      res.json({
        success: true,
        message: "If this email exists, you will receive password reset instructions",
        ...devResponse,
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  // Confirm password reset with token
  app.post("/api/auth/confirm-password-reset", authLimiter, async (req: Request, res: Response) => {
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
            eq(passwordResetTokens.usedAt, null as any),
          ),
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({
          message: "Invalid or expired reset token",
        });
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
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  console.log("Local auth (login/password) configured successfully");
}
