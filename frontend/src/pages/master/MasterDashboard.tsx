import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { masterDashboardApi, MasterInfo } from '../../api/masterDashboard'
import { bookingsApi } from '../../api/bookings'
import { BookingDetailed } from '../../api/types'
import {
  Calendar, Clock, User, Star, TrendingUp, AlertCircle,
  CheckCircle, XCircle, Settings
} from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export default function MasterDashboard() {
  const [masterInfo, setMasterInfo] = useState<MasterInfo | null>(null)
  const [todayBookings, setTodayBookings] = useState<BookingDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [info, bookings] = await Promise.all([
        masterDashboardApi.getMasterInfo(),
        masterDashboardApi.getBookings({ limit: 100 })
      ])

      setMasterInfo(info)

      // Filter today's bookings
      const today = bookings.filter((b: BookingDetailed) => isToday(parseISO(b.start_at)))
      setTodayBookings(today)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled_by_client: 'bg-red-100 text-red-800',
      cancelled_by_salon: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800',
    }
    const labels = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      completed: 'Завершена',
      cancelled_by_client: 'Отменена',
      cancelled_by_salon: 'Отменена',
      no_show: 'Не пришли',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Ошибка загрузки</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-10 h-10 text-primary-600 mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Кабинет мастера</h1>
                <p className="text-gray-600">{masterInfo?.name}</p>
              </div>
            </div>
            <Link
              to="/master/schedule"
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Settings className="w-5 h-5 mr-2" />
              Настройки расписания
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Рейтинг</p>
                <p className="text-3xl font-bold text-gray-900">{masterInfo?.rating.toFixed(1)}</p>
                <p className="text-sm text-gray-500 mt-1">{masterInfo?.reviews_count} отзывов</p>
              </div>
              <Star className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Записей сегодня</p>
                <p className="text-3xl font-bold text-gray-900">{todayBookings.length}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {todayBookings.filter(b => b.status === 'confirmed').length} подтверждено
                </p>
              </div>
              <Calendar className="w-12 h-12 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Опыт работы</p>
                <p className="text-3xl font-bold text-gray-900">{masterInfo?.experience_years} лет</p>
                <p className="text-sm text-gray-500 mt-1">{masterInfo?.specialization}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/master/calendar"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Календарь записей</h3>
                <p className="text-sm text-gray-600">Просмотр расписания и управление записями</p>
              </div>
            </div>
          </Link>

          <Link
            to="/master/bookings"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Все записи</h3>
                <p className="text-sm text-gray-600">Полный список записей с фильтрами</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Today's Bookings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Записи на сегодня</h2>

          {todayBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Нет записей на сегодня</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayBookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {format(parseISO(booking.start_at), 'HH:mm', { locale: ru })} -
                          {format(parseISO(booking.end_at), 'HH:mm', { locale: ru })}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{booking.service?.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Клиент ID: {booking.client_id}
                      </p>
                      {booking.client_notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Примечания: {booking.client_notes}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
