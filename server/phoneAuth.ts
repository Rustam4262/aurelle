import type { Express, Request, Response } from "express";
import { Router } from "express";
import twilio from "twilio";
import { db } from "./db";
import { users, userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

// Store verification codes temporarily (in production, use Redis)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return null;
  }

  return {
    client: twilio(accountSid, authToken),
    serviceSid,
  };
}

export function setupPhoneAuth(app: Express) {
  const twilioConfig = getTwilioClient();

  if (!twilioConfig) {
    console.log("Phone auth not configured - missing Twilio credentials");
    return;
  }

  const router = Router();

  // Send verification code
  router.post("/auth/phone/send-code", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber || !/^\+\d{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({ error: "Invalid phone number format. Use E.164 format (+1234567890)" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store code
      verificationCodes.set(phoneNumber, { code, expiresAt });

      // Send SMS via Twilio
      try {
        await twilioConfig.client.verify.v2
          .services(twilioConfig.serviceSid)
          .verifications.create({
            to: phoneNumber,
            channel: 'sms'
          });

        return res.json({
          success: true,
          message: "Verification code sent",
          expiresIn: 600, // seconds
        });
      } catch (twilioError: any) {
        console.error("Twilio error:", twilioError);

        // Fallback for development: just store the code without sending
        if (process.env.NODE_ENV === "development") {
          console.log(`Development mode - verification code for ${phoneNumber}: ${code}`);
          return res.json({
            success: true,
            message: "Development mode - check console for code",
            devCode: code, // Only in development!
            expiresIn: 600,
          });
        }

        return res.status(500).json({ error: "Failed to send verification code" });
      }
    } catch (error) {
      console.error("Send code error:", error);
      return res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Verify code and login
  router.post("/auth/phone/verify", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({ error: "Phone number and code are required" });
      }

      // Verify code via Twilio
      try {
        const verificationCheck = await twilioConfig.client.verify.v2
          .services(twilioConfig.serviceSid)
          .verificationChecks.create({
            to: phoneNumber,
            code: code
          });

        if (verificationCheck.status !== 'approved') {
          return res.status(400).json({ error: "Invalid or expired verification code" });
        }
      } catch (twilioError: any) {
        // Fallback for development
        if (process.env.NODE_ENV === "development") {
          const stored = verificationCodes.get(phoneNumber);
          if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
            return res.status(400).json({ error: "Invalid or expired verification code" });
          }
          verificationCodes.delete(phoneNumber);
        } else {
          console.error("Twilio verification error:", twilioError);
          return res.status(400).json({ error: "Invalid or expired verification code" });
        }
      }

      // Find or create user
      const userId = `phone:${phoneNumber.replace(/\+/g, '')}`;
      let [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        // Create new user
        [user] = await db.insert(users).values({
          id: userId,
          email: null,
          passwordHash: null,
          phoneNumber,
        }).returning();

        // Create user profile
        await db.insert(userProfiles).values({
          userId,
          role: "client",
          phoneNumber,
          isProfileComplete: false,
        });
      }

      // Create session
      const sessionUser = {
        claims: {
          sub: userId,
          phone_number: phoneNumber,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        access_token: null,
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days
      };

      (req as any).login(sessionUser, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }
        return res.json({ success: true, user: sessionUser.claims });
      });
    } catch (error) {
      console.error("Verify code error:", error);
      return res.status(500).json({ error: "Failed to verify code" });
    }
  });

  app.use("/api", router);
  console.log("Phone auth (SMS) configured successfully");
}

export function isPhoneAuthConfigured(): boolean {
  return getTwilioClient() !== null;
}
