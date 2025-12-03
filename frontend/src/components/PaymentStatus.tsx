import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { Payment, PaymentStatus as PaymentStatusEnum, paymentsApi } from '../api/payments'

interface PaymentStatusProps {
  payment: Payment
  onStatusChange?: (status: PaymentStatusEnum) => void
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // в миллисекундах
}

export default function PaymentStatusComponent({
  payment: initialPayment,
  onStatusChange,
  showDetails = true,
  autoRefresh = false,
  refreshInterval = 5000
}: PaymentStatusProps) {
  const [payment, setPayment] = useState<Payment>(initialPayment)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!autoRefresh) return

    // Автообновление только для pending и processing статусов
    if (payment.status !== PaymentStatusEnum.PENDING && payment.status !== PaymentStatusEnum.PROCESSING) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const updatedPayment = await paymentsApi.getPayment(payment.id)
        setPayment(updatedPayment)

        if (onStatusChange && updatedPayment.status !== payment.status) {
          onStatusChange(updatedPayment.status)
        }
      } catch (error) {
        console.error('Failed to refresh payment status:', error)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [payment.id, payment.status, autoRefresh, refreshInterval, onStatusChange])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updatedPayment = await paymentsApi.getPayment(payment.id)
      setPayment(updatedPayment)

      if (onStatusChange && updatedPayment.status !== payment.status) {
        onStatusChange(updatedPayment.status)
      }
    } catch (error) {
      console.error('Failed to refresh payment status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusConfig = (status: PaymentStatusEnum) => {
    switch (status) {
      case PaymentStatusEnum.PENDING:
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Ожидает оплаты',
          description: 'Платеж создан и ожидает оплаты'
        }
      case PaymentStatusEnum.PROCESSING:
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'В обработке',
          description: 'Платеж обрабатывается платежной системой'
        }
      case PaymentStatusEnum.COMPLETED:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Оплачено',
          description: 'Платеж успешно завершен'
        }
      case PaymentStatusEnum.FAILED:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Ошибка',
          description: payment.error_message || 'Произошла ошибка при обработке платежа'
        }
      case PaymentStatusEnum.REFUNDED:
        return {
          icon: RotateCcw,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          label: 'Возврат',
          description: 'Средства возвращены'
        }
      case PaymentStatusEnum.CANCELLED:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Отменен',
          description: 'Платеж отменен'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Неизвестно',
          description: 'Неизвестный статус'
        }
    }
  }

  const config = getStatusConfig(payment.status)
  const Icon = config.icon

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canRefresh = payment.status === PaymentStatusEnum.PENDING || payment.status === PaymentStatusEnum.PROCESSING

  return (
    <div className={`border-2 rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Icon
            className={`w-6 h-6 ${config.color} ${payment.status === PaymentStatusEnum.PROCESSING ? 'animate-spin' : ''}`}
          />
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
          </div>
        </div>

        {canRefresh && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
            title="Обновить статус"
          >
            <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">ID платежа:</span>
            <span className="font-mono text-gray-900">#{payment.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Сумма:</span>
            <span className="font-semibold text-gray-900">
              {payment.amount.toLocaleString('ru-UZ')} {payment.currency}
            </span>
          </div>

          {payment.commission_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Комиссия:</span>
              <span className="text-orange-600">
                {payment.commission_amount.toLocaleString('ru-UZ')} {payment.currency}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-600">Способ оплаты:</span>
            <span className="text-gray-900 capitalize">{payment.payment_method}</span>
          </div>

          {payment.transaction_id && (
            <div className="flex justify-between">
              <span className="text-gray-600">ID транзакции:</span>
              <span className="font-mono text-xs text-gray-900">{payment.transaction_id}</span>
            </div>
          )}

          {payment.paid_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Оплачено:</span>
              <span className="text-gray-900">{formatDate(payment.paid_at)}</span>
            </div>
          )}

          {payment.refunded_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Возврат:</span>
              <span className="text-gray-900">{formatDate(payment.refunded_at)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Создан:</span>
            <span className="text-gray-700">{formatDate(payment.created_at)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
