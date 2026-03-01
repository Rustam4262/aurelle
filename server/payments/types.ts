import type { Request } from "express";

export interface CreatePaymentParams {
  orderId: string;
  amountUzs: number;
  description: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  externalId: string;
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface WebhookEvent {
  orderId: string;
  status: PaymentStatus;
  externalId: string;
}

export interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /** Returns a parsed WebhookEvent if the request is valid, or null if invalid/unverifiable. */
  verifyWebhook(req: Request): Promise<WebhookEvent | null>;
}
