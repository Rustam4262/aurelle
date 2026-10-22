import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult } from "./types";

/**
 * Click (click.uz) — amount in UZS. Webhook handling (Prepare/Complete,
 * MD5 signature) lives in ./click-protocol, not here.
 */
export class ClickProvider implements PaymentProvider {
  private readonly serviceId: string;
  private readonly merchantId: string;
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
}
