import { useState } from 'react'
import { CreditCard, Wallet, Banknote, Building2 } from 'lucide-react'
import { PaymentMethod } from '../api/payments'

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null
  onSelectMethod: (method: PaymentMethod) => void
  amount: number
  disabled?: boolean
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  amount,
  disabled = false
}: PaymentMethodSelectorProps) {
  const [showDetails, setShowDetails] = useState(false)

  const paymentMethods = [
    {
      id: PaymentMethod.PAYME,
      name: 'Payme',
      icon: Wallet,
      description: 'Оплата через Payme',
      color: 'bg-blue-500',
      commission: 2,
    },
    {
      id: PaymentMethod.CLICK,
      name: 'Click',
      icon: CreditCard,
      description: 'Оплата через Click',
      color: 'bg-purple-500',
      commission: 2,
    },
    {
      id: PaymentMethod.UZUM,
      name: 'Uzum',
      icon: Building2,
      description: 'Оплата через Uzum',
      color: 'bg-green-500',
      commission: 2.5,
    },
    {
      id: PaymentMethod.CASH,
      name: 'Наличные',
      icon: Banknote,
      description: 'Оплата наличными в салоне',
      color: 'bg-gray-500',
      commission: 0,
    },
    {
      id: PaymentMethod.CARD,
      name: 'Карта',
      icon: CreditCard,
      description: 'Оплата картой в салоне',
      color: 'bg-indigo-500',
      commission: 1.5,
    },
  ]

  const calculateTotal = (method: PaymentMethod) => {
    const methodInfo = paymentMethods.find(m => m.id === method)
    if (!methodInfo) return amount
    const commission = (amount * methodInfo.commission) / 100
    return amount + commission
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Способ оплаты</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? 'Скрыть детали' : 'Показать комиссии'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon
          const isSelected = selectedMethod === method.id
          const total = calculateTotal(method.id)
          const commission = total - amount

          return (
            <button
              key={method.id}
              onClick={() => !disabled && onSelectMethod(method.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${method.color} text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>

                  {showDetails && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <div>Сумма: {amount.toLocaleString('ru-UZ')} сум</div>
                      {commission > 0 && (
                        <div className="text-orange-600">
                          Комиссия {method.commission}%: +{commission.toLocaleString('ru-UZ')} сум
                        </div>
                      )}
                      <div className="font-semibold text-gray-900">
                        Итого: {total.toLocaleString('ru-UZ')} сум
                      </div>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedMethod && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 text-sm text-blue-800">
              {selectedMethod === PaymentMethod.CASH || selectedMethod === PaymentMethod.CARD ? (
                <p>Вы оплатите услугу в салоне после её выполнения.</p>
              ) : (
                <p>
                  После подтверждения вы будете перенаправлены на страницу оплаты{' '}
                  {paymentMethods.find(m => m.id === selectedMethod)?.name}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
