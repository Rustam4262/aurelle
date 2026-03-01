import { Router } from "express";
import { PaymeProvider } from "../../payments/payme";
import { handlePaymentWebhook } from "./shared";
import { logger } from "../../lib/logger";

const router = Router();

const payme = (() => {
  try {
    return new PaymeProvider();
  } catch {
    return null;
  }
})();

/**
 * POST /api/webhooks/payme
 * Payme JSONRPC 2.0 webhook. No auth middleware — verified by Basic Auth header.
 */
router.post("/", async (req, res) => {
  if (!payme) {
    logger.warn("Payme webhook received but provider not configured", { source: "webhooks-payme" });
    return res.status(503).json({ error: "Provider not configured" });
  }
  await handlePaymentWebhook(req, res, payme, "payme");
});

export default router;
