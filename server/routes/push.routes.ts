import { Router } from "express";
import { isAuthenticated } from "../auth";
import { createLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { pushSubscriptions, insertPushSubscriptionSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

// Configure web-push with VAPID keys
// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@aurelle.uz";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("[PUSH] ✅ Web Push configured with VAPID keys");
} else {
  console.log("[PUSH] ⚠️ Push notifications not configured - missing VAPID keys");
  console.log("[PUSH] Generate keys with: npx web-push generate-vapid-keys");
}

// Get VAPID public key (for client to use when subscribing)
router.get("/vapid-public-key", (req, res) => {
  if (!vapidPublicKey) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  return res.json({ publicKey: vapidPublicKey });
});

// Subscribe to push notifications
router.post("/subscribe", createLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: "Invalid subscription data" });
    }

    // Check if subscription already exists
    const [existingSubscription] = await db.select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));

    if (existingSubscription) {
      // Update existing subscription
      const [updated] = await db.update(pushSubscriptions)
        .set({
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.headers["user-agent"],
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSubscription.id))
        .returning();

      console.log("[PUSH] Subscription updated:", { userId, endpoint: endpoint.substring(0, 50) });
      return res.json(updated);
    }

    // Create new subscription
    const parsed = insertPushSubscriptionSchema.safeParse({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers["user-agent"],
    });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid subscription data", details: parsed.error.errors });
    }

    const [subscription] = await db.insert(pushSubscriptions)
      .values([parsed.data as any])
      .returning();

    console.log("[PUSH] New subscription created:", { userId, endpoint: endpoint.substring(0, 50) });
    return res.status(201).json(subscription);
  } catch (error) {
    console.error("Subscribe to push error:", error);
    return res.status(500).json({ error: "Failed to subscribe to push notifications" });
  }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required" });
    }

    const deleted = await db.delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    console.log("[PUSH] Subscription deleted:", { userId, endpoint: endpoint.substring(0, 50) });
    return res.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe from push error:", error);
    return res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
  }
});

// Get user's subscriptions (for debugging/management)
router.get("/subscriptions", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const userSubscriptions = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return res.json(userSubscriptions);
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return res.status(500).json({ error: "Failed to get subscriptions" });
  }
});

// Test push notification (for testing)
router.post("/test", isAuthenticated, async (req: any, res) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(503).json({ error: "Push notifications not configured" });
    }

    const userId = req.user.claims.sub;

    // Get user's subscriptions
    const userSubscriptions = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (userSubscriptions.length === 0) {
      return res.status(404).json({ error: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title: "Test Notification",
      body: "This is a test push notification from Aurelle!",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
    });

    const results = await Promise.allSettled(
      userSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          // If subscription is invalid (410 Gone), delete it
          if (error.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            console.log("[PUSH] Deleted invalid subscription:", sub.id);
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log("[PUSH] Test notifications sent:", { userId, successful, failed });
    return res.json({ successful, failed, total: userSubscriptions.length });
  } catch (error) {
    console.error("Test push notification error:", error);
    return res.status(500).json({ error: "Failed to send test notification" });
  }
});

export default router;

// ============ HELPER FUNCTIONS ============

/**
 * Send push notification to specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log("[PUSH] Skipping notification - not configured");
      return { sent: 0, failed: 0 };
    }

    const userSubscriptions = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (userSubscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadStr = JSON.stringify(payload);
    const results = await Promise.allSettled(
      userSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payloadStr
          );
        } catch (error: any) {
          // If subscription is invalid (410 Gone), delete it
          if (error.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            console.log("[PUSH] Deleted invalid subscription:", sub.id);
          }
          throw error;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log("[PUSH] Notifications sent:", { userId, sent, failed });
    return { sent, failed };
  } catch (error) {
    console.error("Send push to user error:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification when new booking is created
 */
export async function sendNewBookingNotification(
  salonOwnerId: string,
  bookingDetails: {
    clientName: string;
    serviceName: string;
    date: string;
    time: string;
  }
) {
  return sendPushToUser(salonOwnerId, {
    title: "New Booking!",
    body: `${bookingDetails.clientName} booked ${bookingDetails.serviceName} for ${bookingDetails.date} at ${bookingDetails.time}`,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: {
      type: "new_booking",
      ...bookingDetails,
    },
  });
}

/**
 * Send push notification for booking reminder
 */
export async function sendBookingReminderNotification(
  clientId: string,
  bookingDetails: {
    salonName: string;
    serviceName: string;
    date: string;
    time: string;
  }
) {
  return sendPushToUser(clientId, {
    title: "Booking Reminder",
    body: `Your appointment at ${bookingDetails.salonName} for ${bookingDetails.serviceName} is tomorrow at ${bookingDetails.time}`,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: {
      type: "booking_reminder",
      ...bookingDetails,
    },
  });
}
