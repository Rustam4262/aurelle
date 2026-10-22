import { Router } from "express";
import { handlePaymeWebhook } from "../../payments/payme-protocol";

const router = Router();

/**
 * POST /api/webhooks/payme
 * Payme JSON-RPC 2.0 webhook, authenticated via HTTP Basic (login "Paycom",
 * password = PAYME_SECRET_KEY). Dispatches CheckPerformTransaction /
 * CreateTransaction / PerformTransaction / CancelTransaction / CheckTransaction.
 */
router.post("/", async (req, res) => {
  const { status, json } = await handlePaymeWebhook(req.headers.authorization, req.body);
  res.status(status).json(json);
});

export default router;
