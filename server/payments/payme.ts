import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult } from "./types";

/**
 * Payme (paycom.uz) — amount in tiyin (UZS × 100).
 * Webhook handling (JSON-RPC 2.0) lives in ./payme-protocol, not here —
 * it is a stateful transaction protocol, not a single verify-and-report call.
 */
export class PaymeProvider implements PaymentProvider {
  private readonly merchantId: string;
  private readonly checkoutBase = "https://checkout.paycom.uz";

  constructor() {
    const merchantId = process.env.PAYME_MERCHANT_ID;
    const secretKey = process.env.PAYME_SECRET_KEY;
    if (!merchantId || !secretKey) {
      throw new Error("PAYME_MERCHANT_ID and PAYME_SECRET_KEY must be set");
    }
    this.merchantId = merchantId;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const amountTiyin = params.amountUzs * 100;
    // Payme checkout URL: base64(m=MERCHANT_ID;ac.order_id=ORDER_ID;a=AMOUNT_TIYIN;l=ru)
    const raw = `m=${this.merchantId};ac.order_id=${params.orderId};a=${amountTiyin};l=ru`;
    const encoded = Buffer.from(raw).toString("base64");
    const paymentUrl = `${this.checkoutBase}/${encoded}`;
    return { paymentUrl, externalId: "" }; // externalId filled in once CreateTransaction arrives
  }
}
