import { Link } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'
import { BookingDetailed } from '../../api/types'

interface Props {
  bookings: BookingDetailed[]
}

export default function RecentBookings({ bookings }: Props) {
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
      'completed': 'Завершено',
      'cancelled_by_client': 'Отменена',
      'cancelled_by_salon': 'Отменена'
    }
    return statuses[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'confirmed': 'bg-green-100 text-green-700 border-green-200',
      'completed': 'bg-blue-100 text-blue-700 border-blue-200',
      'cancelled_by_client': 'bg-red-100 text-red-700 border-red-200',
      'cancelled_by_salon': 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold mb-6">Мои записи</h2>
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            История записей пока пустая
          </h3>
          <p className="text-gray-600 mb-6">
            Запишитесь на процедуру в любимый салон
          </p>
          <Link
            to="/client/salons"
            className="inline-block bg-pink-500 text-white px-8 py-3 rounded-xl hover:bg-pink-600 transition-colors font-semibold"
          >
            Найти салон
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Последние записи</h2>
        <Link
          to="/client/bookings"
          className="flex items-center text-pink-500 hover:text-pink-600 font-semibold text-sm group"
        >
          Смотреть все
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="space-y-3">
        {bookings.slice(0, 3).map((booking) => (
          <Link
            key={booking.id}
            to={`/client/bookings/${booking.id}`}
            className="block p-5 border-2 border-gray-100 rounded-xl hover:border-pink-200 hover:bg-pink-50 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg mb-1 group-hover:text-pink-500 transition-colors">
                  {booking.salon?.name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {booking.service?.title}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(booking.start_at)}
                </p>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                {getStatusText(booking.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
