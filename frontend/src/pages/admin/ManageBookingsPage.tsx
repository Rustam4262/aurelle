import { useState, useEffect } from 'react'
import { adminApi, AdminBooking } from '../../api/admin'
import { Booking } from '../../api/types'
import {
  Calendar,
  Search,
  Filter,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

type BookingStatus = Booking['status']

export default function ManageBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null)

  useEffect(() => {
    loadBookings()
  }, [statusFilter])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 500 }
      if (statusFilter !== 'all') {
        params.status_filter = statusFilter
      }
      const data = await adminApi.getAllBookings(params)
      setBookings(data)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      pending: {
        label: 'Ожидает',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      confirmed: {
        label: 'Подтверждено',
        icon: CheckCircle,
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      completed: {
        label: 'Завершено',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      cancelled_by_client: {
        label: 'Отменено клиентом',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      cancelled_by_salon: {
        label: 'Отменено салоном',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      no_show: {
        label: 'Не явился',
        icon: AlertCircle,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const getFilteredBookings = () => {
    if (!searchQuery.trim()) {
      return bookings
    }

    const query = searchQuery.toLowerCase()
    return bookings.filter(booking =>
      booking.id.toString().includes(query) ||
      booking.client_id.toString().includes(query) ||
      booking.salon_id.toString().includes(query) ||
      booking.master_id.toString().includes(query)
    )
  }

  const filteredBookings = getFilteredBookings()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка бронирований...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-8 h-8 mr-3 text-pink-500" />
          Управление бронированиями
        </h1>
        <p className="text-gray-600 mt-2">
          Все бронирования на платформе
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по ID бронирования, клиента, салона, мастера..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="confirmed">Подтверждено</option>
              <option value="completed">Завершено</option>
              <option value="cancelled_by_client">Отменено клиентом</option>
              <option value="cancelled_by_salon">Отменено салоном</option>
              <option value="no_show">Не явился</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            <p className="text-sm text-gray-600">Всего</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600">Ожидает</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </p>
            <p className="text-sm text-gray-600">Подтверждено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">Завершено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {bookings.filter(b => b.status === 'cancelled_by_client' || b.status === 'cancelled_by_salon').length}
            </p>
            <p className="text-sm text-gray-600">Отменено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {bookings.filter(b => b.status === 'no_show').length}
            </p>
            <p className="text-sm text-gray-600">Не явился</p>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Клиент</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Салон</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Мастер</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Услуга</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Дата</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Цена</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Статус</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Бронирования не найдены
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">#{booking.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">ID: {booking.client_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">ID: {booking.salon_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">ID: {booking.master_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">ID: {booking.service_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(booking.start_at), 'd MMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(booking.start_at), 'HH:mm', { locale: ru })} - {format(parseISO(booking.end_at), 'HH:mm', { locale: ru })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                        {booking.price.toFixed(2)} ₽
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Просмотр"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Детали бронирования</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ID бронирования</p>
                  <p className="font-semibold text-gray-900">#{selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Статус</p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID клиента</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.client_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID салона</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.salon_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID мастера</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.master_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID услуги</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.service_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Дата и время</p>
                  <p className="font-semibold text-gray-900">
                    {format(parseISO(selectedBooking.start_at), 'd MMMM yyyy, HH:mm', { locale: ru })} - {format(parseISO(selectedBooking.end_at), 'HH:mm', { locale: ru })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Цена</p>
                  <p className="font-semibold text-gray-900 text-lg">{selectedBooking.price.toFixed(2)} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Создано</p>
                  <p className="font-semibold text-gray-900">
                    {format(parseISO(selectedBooking.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
