import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, User } from 'lucide-react'
import { BookingDetailed } from '../../api/types'

interface Props {
  booking: BookingDetailed | null
  onCancel?: () => void
}

export default function UpcomingBookingCard({ booking, onCancel }: Props) {
  if (!booking) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            У вас пока нет запланированных визитов
          </h3>
          <p className="text-gray-600 mb-6">
            Найдите идеальный салон и запишитесь на процедуру
          </p>
          <Link
            to="/client/salons"
            className="inline-block bg-pink-500 text-white px-8 py-3 rounded-xl hover:bg-pink-600 transition-colors font-medium"
          >
            Найти салон
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      'pending': 'В ожидании',
      'confirmed': 'Подтверждена',
      'completed': 'Завершена',
      'cancelled_by_client': 'Отменена',
      'cancelled_by_salon': 'Отменена салоном'
    }
    return statuses[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled_by_client': 'bg-red-100 text-red-800',
      'cancelled_by_salon': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-2xl shadow-md p-6 mb-8 border border-pink-100 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Ближайшая запись</h2>
          <p className="text-sm text-gray-600">Не забудьте про предстоящий визит</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
          {getStatusText(booking.status)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <MapPin className="w-5 h-5 text-pink-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-lg">{booking.salon?.name}</p>
              <p className="text-sm text-gray-600">{booking.salon?.address}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Clock className="w-5 h-5 text-pink-500 mr-3 flex-shrink-0" />
            <p className="text-gray-900 font-semibold">{formatDate(booking.start_at)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Услуга</p>
            <p className="font-semibold text-gray-900 text-lg">{booking.service?.title}</p>
            <p className="text-sm text-gray-600">Длительность: {booking.service?.duration_minutes} мин</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Мастер</p>
            <div className="flex items-center">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <p className="font-semibold text-gray-900">{booking.master?.name}</p>
            </div>
            {booking.master?.specialization && (
              <p className="text-sm text-gray-600 ml-6">{booking.master.specialization}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              to={`/client/bookings/${booking.id}`}
              className="flex-1 bg-pink-500 text-white px-4 py-3 rounded-xl hover:bg-pink-600 transition-colors text-center font-semibold text-sm"
            >
              Посмотреть запись
            </Link>
            {booking.status === 'pending' && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors font-semibold text-sm"
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
