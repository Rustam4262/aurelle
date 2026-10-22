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

export interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
}
