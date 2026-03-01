import { Router } from "express";
import { ClickProvider } from "../../payments/click";
import { handlePaymentWebhook } from "./shared";
import { logger } from "../../lib/logger";

const router = Router();

const click = (() => {
  try {
    return new ClickProvider();
  } catch {
    return null;
  }
})();

/**
 * POST /api/webhooks/click
 * Click webhook. No auth middleware — verified by MD5 signature in body.
 */
router.post("/", async (req, res) => {
  if (!click) {
    logger.warn("Click webhook received but provider not configured", { source: "webhooks-click" });
    return res.status(503).json({ error: "Provider not configured" });
  }
  await handlePaymentWebhook(req, res, click, "click");
});

export default router;
