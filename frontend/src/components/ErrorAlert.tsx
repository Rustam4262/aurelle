import { X, AlertCircle, AlertTriangle } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onClose?: () => void
  variant?: 'error' | 'warning'
}

export default function ErrorAlert({ message, onClose, variant = 'error' }: ErrorAlertProps) {
  const isError = variant === 'error'

  const bgColor = isError ? 'bg-red-50' : 'bg-yellow-50'
  const borderColor = isError ? 'border-red-200' : 'border-yellow-200'
  const textColor = isError ? 'text-red-800' : 'text-yellow-800'
  const iconColor = isError ? 'text-red-600' : 'text-yellow-600'

  const Icon = isError ? AlertCircle : AlertTriangle

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`${textColor} text-sm font-medium`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${textColor} hover:opacity-75 transition-opacity ml-3 flex-shrink-0`}
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
