import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../../api/bookings'
import { Booking } from '../../api/types'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const data = await bookingsApi.getBookings({ limit: 20 })
      setBookings(data)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled_by_client: 'bg-red-100 text-red-800',
      cancelled_by_salon: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      completed: 'Завершена',
      cancelled_by_client: 'Отменена',
      cancelled_by_salon: 'Отменена салоном',
      no_show: 'Не пришли',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/client/dashboard" className="flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Мои записи</h1>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">У вас пока нет записей</p>
            <Link
              to="/client/salons"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              Найти салон
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Запись #{booking.id}</h3>
                    <div className="flex items-center text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{format(new Date(booking.start_at), 'dd.MM.yyyy')}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{format(new Date(booking.start_at), 'HH:mm')}</span>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">Цена: {booking.price} сум</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
