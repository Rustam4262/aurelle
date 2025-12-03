import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import { bookingsApi, DetailedBooking } from '../../api/bookings'
import { Salon } from '../../api/types'
import {
  Users, Building2, Calendar, TrendingUp,
  DollarSign, Activity, MapPin, Star, Clock, Package, ArrowRight
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

interface PlatformStats {
  totalSalons: number
  totalBookings: number
  totalRevenue: number
  activeSalons: number
}

export default function AdminDashboard() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [recentBookings, setRecentBookings] = useState<DetailedBooking[]>([])
  const [stats, setStats] = useState<PlatformStats>({
    totalSalons: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeSalons: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load all salons
      const salonsData = await salonsApi.getSalons({ limit: 100 })
      setSalons(salonsData)

      // Load recent bookings (limit to 10 most recent)
      const bookingsData = await bookingsApi.getMyBookingsDetailed({ limit: 10 })
      setRecentBookings(bookingsData)

      // Calculate platform stats
      const activeSalonsCount = salonsData.filter(s => s.is_active).length
      const totalRevenue = bookingsData
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + b.price, 0)

      setStats({
        totalSalons: salonsData.length,
        totalBookings: bookingsData.length,
        totalRevenue,
        activeSalons: activeSalonsCount
      })
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border border-green-200',
      completed: 'bg-gray-100 text-gray-800 border border-gray-200',
      cancelled_by_client: 'bg-red-100 text-red-800 border border-red-200',
      cancelled_by_salon: 'bg-red-100 text-red-800 border border-red-200',
      no_show: 'bg-orange-100 text-orange-800 border border-orange-200',
    }
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      completed: 'Завершена',
      cancelled_by_client: 'Отменена клиентом',
      cancelled_by_salon: 'Отменена салоном',
      no_show: 'Не пришли',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Панель администратора</h1>
          <p className="text-gray-600 mt-1">Обзор платформы Beauty Salon Marketplace</p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Users className="w-5 h-5 mr-2" />
          Управление пользователями
        </Link>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSalons}</p>
            <p className="text-gray-600 text-sm mt-1">Всего салонов</p>
            <p className="text-xs text-gray-500 mt-2">Активных: {stats.activeSalons}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
            <p className="text-gray-600 text-sm mt-1">Записей</p>
            <p className="text-xs text-gray-500 mt-2">Последние загруженные</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-gray-600 text-sm mt-1">Выручка (₽)</p>
            <p className="text-xs text-gray-500 mt-2">Завершенные записи</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {salons.reduce((sum, s) => sum + (s.reviews_count || 0), 0)}
            </p>
            <p className="text-gray-600 text-sm mt-1">Отзывов</p>
            <p className="text-xs text-gray-500 mt-2">На платформе</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Salons */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary-600" />
                Топ салонов
              </h2>
            </div>
            <div className="p-6">
              {salons.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Салонов пока нет</p>
              ) : (
                <div className="space-y-4">
                  {salons
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 5)
                    .map((salon, index) => (
                      <div key={salon.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{salon.name}</p>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {salon.address}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                          <span className="font-semibold text-gray-900">{salon.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-gray-500 text-sm ml-1">({salon.reviews_count || 0})</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                Последние записи
              </h2>
            </div>
            <div className="p-6">
              {recentBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Записей пока нет</p>
              ) : (
                <div className="space-y-4">
                  {recentBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{booking.salon?.name}</p>
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                            <Package className="w-3 h-3 mr-1" />
                            {booking.service?.title}
                          </div>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(parseISO(booking.start_at), 'd MMM, HH:mm', { locale: ru })}
                        </div>
                        <span className="font-semibold text-gray-900">{booking.price.toLocaleString()} ₽</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Salons Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Все салоны платформы</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Название</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Адрес</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Рейтинг</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Отзывов</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salons.map((salon) => (
                  <tr key={salon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{salon.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{salon.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{salon.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        <span className="font-semibold">{salon.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{salon.reviews_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {salon.is_active ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                          Активен
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">
                          Неактивен
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Quick Links */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <Link
          to="/admin/salons"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление салонами</h3>
              <p className="text-gray-600 text-sm">Модерация, блокировка, статистика</p>
            </div>
            <ArrowRight className="w-6 h-6 text-blue-500" />
          </div>
        </Link>

        <Link
          to="/admin/bookings"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Все бронирования</h3>
              <p className="text-gray-600 text-sm">Просмотр и управление записями</p>
            </div>
            <ArrowRight className="w-6 h-6 text-green-500" />
          </div>
        </Link>

        <Link
          to="/admin/support"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Жалобы и поддержка</h3>
              <p className="text-gray-600 text-sm">Обработка обращений</p>
            </div>
            <ArrowRight className="w-6 h-6 text-red-500" />
          </div>
        </Link>
      </div>
    </div>
  )
}
