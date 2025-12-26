import { Router } from "express";
import { contactSchema, newsletterSchema } from "@shared/schema";

const router = Router();

// Contact form submission
router.post("/contact", async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form data", details: parsed.error.errors });
    }
    // For now, just return success (can store in DB later)
    return res.status(201).json({ success: true, message: "Thank you for your message!" });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({ error: "Failed to submit form" });
  }
});

// Newsletter subscription
router.post("/newsletter", async (req, res) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email", details: parsed.error.errors });
    }
    return res.status(201).json({ success: true, message: "Thank you for subscribing!" });
  } catch (error) {
    console.error("Newsletter error:", error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
