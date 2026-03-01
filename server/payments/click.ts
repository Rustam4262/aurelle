import crypto from "crypto";
import type { Request } from "express";
import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookEvent } from "./types";
import { logger } from "../lib/logger";

/** Click (click.uz) — amount in UZS, MD5 signature verification */
export class ClickProvider implements PaymentProvider {
  private readonly serviceId: string;
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly checkoutBase = "https://my.click.uz/services/pay";

  constructor() {
    const serviceId = process.env.CLICK_SERVICE_ID;
    const merchantId = process.env.CLICK_MERCHANT_ID;
    const secretKey = process.env.CLICK_SECRET_KEY;
    if (!serviceId || !merchantId || !secretKey) {
      throw new Error("CLICK_SERVICE_ID, CLICK_MERCHANT_ID, and CLICK_SECRET_KEY must be set");
    }
    this.serviceId = serviceId;
    this.merchantId = merchantId;
    this.secretKey = secretKey;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const qs = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: String(params.amountUzs),
      transaction_param: params.orderId,
      return_url: params.returnUrl,
    });
    const paymentUrl = `${this.checkoutBase}?${qs.toString()}`;
    return { paymentUrl, externalId: "" };
  }

  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    try {
      const body = req.body as {
        click_trans_id?: string;
        merchant_trans_id?: string;
        amount?: string;
        action?: string;
        sign_time?: string;
        sign_string?: string;
        error?: string;
      };

      const {
        click_trans_id,
        merchant_trans_id,
        amount,
        action,
        sign_time,
        sign_string,
      } = body;

      if (!click_trans_id || !merchant_trans_id || !amount || !action || !sign_time || !sign_string) {
        return null;
      }

      // MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
      const rawSign = `${click_trans_id}${this.serviceId}${this.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
      const expectedSign = crypto.createHash("md5").update(rawSign).digest("hex");

      if (sign_string !== expectedSign) {
        logger.warn("Click webhook: signature mismatch", { source: "payments-click" });
        return null;
      }

      const errorCode = parseInt(body.error ?? "0", 10);
      let status: WebhookEvent["status"] = "pending";

      if (action === "2") {
        // action=2 is PerformTransaction
        status = errorCode === 0 ? "succeeded" : "failed";
      } else if (action === "1") {
        // action=1 is CreateTransaction — not terminal
        return null;
      }

      return {
        orderId: merchant_trans_id,
        status,
        externalId: click_trans_id,
      };
    } catch (err) {
      logger.error("Click webhook parse error", err instanceof Error ? err : new Error(String(err)), {
        source: "payments-click",
      });
      return null;
    }
  }
}
