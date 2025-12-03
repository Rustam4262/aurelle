import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { masterDashboardApi } from '../../api/masterDashboard'
import { BookingDetailed } from '../../api/types'
import { ArrowLeft, Calendar, Filter, Search, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

export default function MasterBookingsPage() {
  const [bookings, setBookings] = useState<BookingDetailed[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [bookings, statusFilter, dateFrom, dateTo, searchQuery])

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await masterDashboardApi.getBookings({ limit: 500 })
      setBookings(data)
    } catch (err) {
      console.error('Error loading bookings:', err)
      setError('Не удалось загрузить записи')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...bookings]

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'cancelled') {
        filtered = filtered.filter(b =>
          b.status === 'cancelled_by_client' ||
          b.status === 'cancelled_by_salon' ||
          b.status === 'no_show'
        )
      } else {
        filtered = filtered.filter(b => b.status === statusFilter)
      }
    }

    // Date range
    if (dateFrom) {
      filtered = filtered.filter(b => parseISO(b.start_at) >= parseISO(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(b => parseISO(b.start_at) <= parseISO(dateTo + 'T23:59:59'))
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.service?.title.toLowerCase().includes(query) ||
        b.id.toString().includes(query)
      )
    }

    // Sort by date descending
    filtered.sort((a, b) => parseISO(b.start_at).getTime() - parseISO(a.start_at).getTime())

    setFilteredBookings(filtered)
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border border-green-200',
      completed: 'bg-gray-100 text-gray-800 border border-gray-200',
      cancelled_by_client: 'bg-red-100 text-red-800 border border-red-200',
      cancelled_by_salon: 'bg-red-100 text-red-800 border border-red-200',
      no_show: 'bg-orange-100 text-orange-800 border border-orange-200',
    }
    const labels = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      completed: 'Завершена',
      cancelled_by_client: 'Отменена клиентом',
      cancelled_by_salon: 'Отменена салоном',
      no_show: 'Не пришли',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo || searchQuery

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка записей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/master/dashboard" className="flex items-center text-primary-600 hover:text-primary-700">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Назад к дашборду
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Все записи</h1>
            <Link
              to="/master/calendar"
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Календарь
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Status Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-white rounded-lg shadow-sm p-3">
            {[
              { value: 'all', label: 'Все' },
              { value: 'pending', label: 'Ожидают' },
              { value: 'confirmed', label: 'Подтверждены' },
              { value: 'completed', label: 'Завершены' },
              { value: 'cancelled', label: 'Отменены' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as StatusFilter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Фильтры</h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Сбросить все
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Услуга, ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата от
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата до
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <div className="mb-4 text-sm text-gray-600">
            Найдено записей: <span className="font-semibold">{filteredBookings.length}</span> из {bookings.length}
          </div>
        )}

        {/* Bookings Table */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Записей не найдено</h3>
            <p className="text-gray-600 mb-6">
              {bookings.length === 0
                ? 'У вас пока нет записей'
                : 'Нет записей по выбранным фильтрам'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Услуга</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Дата и время</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Клиент</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">#{booking.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{booking.service?.title}</div>
                        <div className="text-sm text-gray-500">{booking.service?.duration_minutes} мин</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(parseISO(booking.start_at), 'd MMM yyyy', { locale: ru })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(parseISO(booking.start_at), 'HH:mm')} - {format(parseISO(booking.end_at), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">ID: {booking.client_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {booking.price.toLocaleString()} сум
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
