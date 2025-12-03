import { apiClient } from './client'

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  CASH = 'cash',
  CARD = 'card',
}

export interface Payment {
  id: number
  booking_id: number
  amount: number
  currency: string
  payment_method: PaymentMethod
  status: PaymentStatus
  transaction_id?: string
  commission_amount: number
  net_amount: number
  paid_at?: string
  refunded_at?: string
  error_message?: string
  created_at: string
  updated_at?: string
}

export interface PaymentCreate {
  booking_id: number
  amount: number
  payment_method: PaymentMethod
  currency?: string
}

export interface PaymentRefund {
  reason: string
}

export const paymentsApi = {
  // Создать платеж
  createPayment: async (data: PaymentCreate): Promise<Payment> => {
    const response = await apiClient.post('/payments/create', data)
    return response.data
  },

  // Получить информацию о платеже
  getPayment: async (paymentId: number): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${paymentId}`)
    return response.data
  },

  // Получить все платежи по бронированию
  getBookingPayments: async (bookingId: number): Promise<Payment[]> => {
    const response = await apiClient.get(`/payments/booking/${bookingId}`)
    return response.data
  },

  // Возврат средств
  refundPayment: async (paymentId: number, data: PaymentRefund): Promise<Payment> => {
    const response = await apiClient.post(`/payments/${paymentId}/refund`, data)
    return response.data
  },

  // Получить статус платежа (для polling)
  checkPaymentStatus: async (paymentId: number): Promise<PaymentStatus> => {
    const payment = await paymentsApi.getPayment(paymentId)
    return payment.status
  },
}
