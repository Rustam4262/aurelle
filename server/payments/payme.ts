import crypto from "crypto";
import type { Request } from "express";
import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookEvent } from "./types";
import { logger } from "../lib/logger";

/** Payme (paycom.uz) — amount in tiyin (UZS × 100), JSONRPC 2.0 webhook */
export class PaymeProvider implements PaymentProvider {
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly checkoutBase = "https://checkout.paycom.uz";

  constructor() {
    const merchantId = process.env.PAYME_MERCHANT_ID;
    const secretKey = process.env.PAYME_SECRET_KEY;
    if (!merchantId || !secretKey) {
      throw new Error("PAYME_MERCHANT_ID and PAYME_SECRET_KEY must be set");
    }
    this.merchantId = merchantId;
    this.secretKey = secretKey;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const amountTiyin = params.amountUzs * 100;
    // Payme checkout URL: base64(m=MERCHANT_ID;ac.order_id=ORDER_ID;a=AMOUNT_TIYIN;l=ru)
    const raw = `m=${this.merchantId};ac.order_id=${params.orderId};a=${amountTiyin};l=ru`;
    const encoded = Buffer.from(raw).toString("base64");
    const paymentUrl = `${this.checkoutBase}/${encoded}`;
    return { paymentUrl, externalId: "" }; // externalId filled after webhook
  }

  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    try {
      // Payme sends HTTP Basic auth: login=Paycom, password=SECRET_KEY
      const authHeader = req.headers.authorization ?? "";
      if (!authHeader.startsWith("Basic ")) return null;

      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
      const [, password] = decoded.split(":");
      if (password !== this.secretKey) {
        logger.warn("Payme webhook: invalid secret", { source: "payments-payme" });
        return null;
      }

      // JSONRPC body
      const body = req.body as {
        method?: string;
        params?: {
          account?: { order_id?: string };
          id?: string;
        };
      };

      const method = body.method;
      const orderId = body.params?.account?.order_id;
      const externalId = body.params?.id ?? "";

      if (!orderId) return null;

      let status: WebhookEvent["status"] = "pending";
      if (method === "PerformTransaction") status = "succeeded";
      else if (method === "CancelTransaction") status = "cancelled";
      else if (method === "CheckPerformTransaction" || method === "CreateTransaction") {
        // Not a terminal state — return null to skip DB update
        return null;
      }

      return { orderId, status, externalId };
    } catch (err) {
      logger.error("Payme webhook parse error", err instanceof Error ? err : new Error(String(err)), {
        source: "payments-payme",
      });
      return null;
    }
  }
}
