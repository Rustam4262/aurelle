import { Router } from "express";
import { handleClickWebhook } from "../../payments/click-protocol";

const router = Router();

/**
 * POST /api/webhooks/click
 * Click Prepare/Complete webhook. No auth middleware — verified by MD5
 * signature in the body. The response shape (click_trans_id, merchant_trans_id,
 * merchant_prepare_id, error, error_note) is Click's own protocol contract,
 * not a generic {ok} envelope — Click retries indefinitely otherwise.
 */
router.post("/", async (req, res) => {
  await handleClickWebhook(req.body, res);
});

export default router;
