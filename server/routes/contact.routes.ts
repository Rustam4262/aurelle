import { Router } from "express";
import {
  contactSchema,
  newsletterSchema,
  contactSubmissions,
  newsletterSubscribers,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../lib/logger";
import { isEmailConfigured, sendEmail } from "../email";
import { createLimiter } from "../middleware/rateLimiter";

const router = Router();

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

// Contact form submission
router.post("/contact", createLimiter, async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form data", details: parsed.error.issues });
    }

    const [submission] = await db.insert(contactSubmissions).values(parsed.data).returning();

    const notifyTo = process.env.CONTACT_NOTIFY_EMAIL;
    if (isEmailConfigured() && notifyTo) {
      const { name, email, phone, service, message } = parsed.data;
      sendEmail(
        notifyTo,
        `New contact form submission from ${escapeHtml(name)}`,
        `<p><b>Name:</b> ${escapeHtml(name)}</p>
         <p><b>Email:</b> ${escapeHtml(email)}</p>
         <p><b>Phone:</b> ${phone ? escapeHtml(phone) : "—"}</p>
         <p><b>Service:</b> ${service ? escapeHtml(service) : "—"}</p>
         <p><b>Message:</b> ${message ? escapeHtml(message) : "—"}</p>`,
      )
        .then((sent) =>
          sent
            ? db
                .update(contactSubmissions)
                .set({ emailSent: true })
                .where(eq(contactSubmissions.id, submission.id))
            : undefined,
        )
        .catch((err) =>
          logger.error("Failed to send contact notification email", err, { source: "contact" }),
        );
    }

    return res.status(201).json({ success: true, message: "Thank you for your message!" });
  } catch (error) {
    logger.error("Contact form error", error, { source: "contact" });
    return res.status(500).json({ error: "Failed to submit form" });
  }
});

// Newsletter subscription
router.post("/newsletter", createLimiter, async (req, res) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email", details: parsed.error.issues });
    }

    await db.insert(newsletterSubscribers).values(parsed.data).onConflictDoNothing();

    return res.status(201).json({ success: true, message: "Thank you for subscribing!" });
  } catch (error) {
    logger.error("Newsletter error", error, { source: "contact" });
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
