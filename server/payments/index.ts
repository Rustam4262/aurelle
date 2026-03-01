import type { PaymentProvider } from "./types";
import { PaymeProvider } from "./payme";
import { ClickProvider } from "./click";

export type { PaymentProvider, CreatePaymentParams, CreatePaymentResult, WebhookEvent, PaymentStatus } from "./types";

/**
 * Returns the configured payment provider, or null if PAYMENT_PROVIDER is not set.
 * Set PAYMENT_PROVIDER=payme or PAYMENT_PROVIDER=click in .env.
 */
export function getPaymentProvider(): PaymentProvider | null {
  const p = process.env.PAYMENT_PROVIDER;
  if (!p) return null;
  if (p === "click") return new ClickProvider();
  return new PaymeProvider(); // default to Payme
}
