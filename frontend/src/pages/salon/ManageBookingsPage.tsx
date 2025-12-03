import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../../api/bookings'
import { BookingDetailed, Master } from '../../api/types'
import { mastersApi } from '../../api/masters'
import { salonsApi } from '../../api/salons'
import {
  ArrowLeft, Calendar, AlertCircle, Check, XCircle, Loader,
  Search, Filter, X, Clock, User, Phone, Mail, MessageSquare,
  CheckCircle, UserX, DollarSign, Package
} from 'lucide-react'
import { format, parseISO, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

export default function ManageBookingsPage() {
  const [bookings, setBookings] = useState<BookingDetailed[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salonId, setSalonId] = useState<number | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Actions
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailed | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get salon ID
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const salon = salons[0]
        setSalonId(salon.id)

        // Load masters and bookings in parallel
        const [mastersData, bookingsData] = await Promise.all([
          mastersApi.getMasters({ salon_id: salon.id }),
          bookingsApi.getMyBookingsDetailed({ limit: 100 })
        ])

        setMasters(mastersData)
        setBookings(bookingsData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Не удалось загрузить данные. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      setActioningId(id)
      await bookingsApi.updateBooking(id, { status })
      await loadData()
      if (showDetailModal && selectedBooking?.id === id) {
        const updatedBooking = bookings.find(b => b.id === id)
        if (updatedBooking) {
          setSelectedBooking({ ...updatedBooking, status: status as 'pending' | 'confirmed' | 'cancelled_by_client' | 'cancelled_by_salon' | 'completed' | 'no_show' })
        }
      }
    } catch (err) {
      console.error('Error updating booking status:', err)
      alert('Не удалось обновить статус записи. Попробуйте позже.')
    } finally {
      setActioningId(null)
    }
  }

  const handleConfirmBooking = (id: number) => handleUpdateStatus(id, 'confirmed')
  const handleCancelBooking = (id: number) => {
    if (confirm('Вы уверены, что хотите отменить эту запись?')) {
      handleUpdateStatus(id, 'cancelled_by_salon')
    }
  }
  const handleCompleteBooking = (id: number) => handleUpdateStatus(id, 'completed')
  const handleNoShowBooking = (id: number) => handleUpdateStatus(id, 'no_show')

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300',
      confirmed: 'bg-green-100 text-green-800 border-2 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-2 border-gray-300',
      cancelled_by_client: 'bg-red-100 text-red-800 border-2 border-red-300',
      cancelled_by_salon: 'bg-red-100 text-red-800 border-2 border-red-300',
      no_show: 'bg-orange-100 text-orange-800 border-2 border-orange-300',
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
      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800 border-2 border-gray-300'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'd MMM yyyy, HH:mm', { locale: ru })
  }

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'd MMMM yyyy', { locale: ru })
  }

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'HH:mm', { locale: ru })
  }

  const canConfirmOrCancel = (booking: BookingDetailed) => {
    return booking.status === 'pending' || booking.status === 'confirmed'
  }

  const canComplete = (booking: BookingDetailed) => {
    return booking.status === 'confirmed'
  }

  const filterTabsConfig = [
    { value: 'all' as const, label: 'Все' },
    { value: 'pending' as const, label: 'Ожидают' },
    { value: 'confirmed' as const, label: 'Подтверждены' },
    { value: 'completed' as const, label: 'Завершены' },
    { value: 'cancelled' as const, label: 'Отменены' },
  ]

  const getFilteredBookings = () => {
    let filtered = bookings

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

    // Master filter
    if (selectedMaster) {
      filtered = filtered.filter(b => b.master?.id === selectedMaster)
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = startOfDay(parseISO(dateFrom))
      filtered = filtered.filter(b => !isBefore(parseISO(b.start_at), fromDate))
    }
    if (dateTo) {
      const toDate = endOfDay(parseISO(dateTo))
      filtered = filtered.filter(b => !isAfter(parseISO(b.start_at), toDate))
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.service?.title.toLowerCase().includes(query) ||
        b.master?.name.toLowerCase().includes(query) ||
        b.id.toString().includes(query)
      )
    }

    return filtered.sort((a, b) =>
      new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    )
  }

  const filteredBookings = getFilteredBookings()

  const getFilteredCount = (status: StatusFilter) => {
    if (status === 'all') return bookings.length
    if (status === 'cancelled') {
      return bookings.filter(b =>
        b.status === 'cancelled_by_client' ||
        b.status === 'cancelled_by_salon' ||
        b.status === 'no_show'
      ).length
    }
    return bookings.filter(b => b.status === status).length
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedMaster(null)
    setDateFrom('')
    setDateTo('')
    setStatusFilter('all')
  }

  const hasActiveFilters = searchQuery || selectedMaster || dateFrom || dateTo || statusFilter !== 'all'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Назад к дашборду
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 font-medium">Загрузка записей...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Назад к дашборду
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Ошибка загрузки</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Назад к дашборду
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Управление записями
          </h1>
          <p className="text-gray-600 text-lg">Управляйте записями клиентов в вашем салоне</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-3 border border-pink-100">
            {filterTabsConfig.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  statusFilter === tab.value
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 border border-pink-200'
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-sm ${statusFilter === tab.value ? 'opacity-90' : 'opacity-60'}`}>
                  ({getFilteredCount(tab.value)})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 mb-6 border border-pink-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Фильтры</h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-pink-700 hover:text-pink-800 font-semibold bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors border border-pink-200"
              >
                Сбросить все
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Поиск
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Услуга, мастер, ID..."
                  className="w-full pl-10 pr-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Master Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Мастер
              </label>
              <select
                value={selectedMaster || ''}
                onChange={(e) => setSelectedMaster(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
              >
                <option value="">Все мастера</option>
                {masters.map(master => (
                  <option key={master.id} value={master.id}>{master.name}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дата от
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дата до
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="mb-4 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <span className="text-sm text-gray-700">
              Найдено записей: <span className="font-bold text-pink-700">{filteredBookings.length}</span> из {bookings.length}
            </span>
          </div>
        )}

        {/* Bookings Table */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-12 text-center border border-pink-100">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Записей не найдено</h3>
            <p className="text-gray-600 text-lg mb-6">
              {bookings.length === 0
                ? 'У вас пока нет записей от клиентов'
                : 'Нет записей по выбранным фильтрам'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 font-semibold shadow-lg"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-pink-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Услуга</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Мастер</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Дата и время</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Стоимость</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100">
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowDetailModal(true)
                      }}
                    >
                      {/* ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-mono text-pink-700 font-semibold">#{booking.id}</p>
                      </td>

                      {/* Service */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{booking.service?.title || 'Услуга'}</p>
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                            <Clock className="w-3 h-3 mr-1 text-pink-500" />
                            {booking.service?.duration_minutes || 0} мин
                          </div>
                        </div>
                      </td>

                      {/* Master */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm">
                            {booking.master?.name.charAt(0).toUpperCase() || 'M'}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{booking.master?.name || 'Мастер'}</p>
                        </div>
                      </td>

                      {/* Date/Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{formatDateTime(booking.start_at)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{booking.price.toLocaleString()} ₽</p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmBooking(booking.id)}
                                disabled={actioningId === booking.id}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Подтвердить"
                              >
                                {actioningId === booking.id ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={actioningId === booking.id}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Отменить"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleCompleteBooking(booking.id)}
                                disabled={actioningId === booking.id}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Завершить"
                              >
                                {actioningId === booking.id ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleNoShowBooking(booking.id)}
                                disabled={actioningId === booking.id}
                                className="p-2 text-orange-600 hover:bg-orange-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Не пришел"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={actioningId === booking.id}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Отменить"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-pink-200">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Запись #{selectedBooking.id}
                </h2>
                <p className="text-pink-100 text-sm mt-1">Детали бронирования</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Статус</h3>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>

              {/* Service Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Услуга</h3>
                    <p className="text-gray-900 font-semibold text-lg">{selectedBooking.service?.title}</p>
                    {selectedBooking.service?.description && (
                      <p className="text-sm text-gray-600 mt-2">{selectedBooking.service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center text-sm">
                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center mr-2">
                          <Clock className="w-4 h-4 text-pink-600" />
                        </div>
                        <span className="font-semibold text-gray-700">{selectedBooking.service?.duration_minutes} мин</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center mr-2">
                          <DollarSign className="w-4 h-4 text-pink-600" />
                        </div>
                        <span className="font-semibold text-gray-700">{selectedBooking.price.toLocaleString()} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Мастер</h3>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold mr-3 shadow-md text-lg">
                        {selectedBooking.master?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-lg">{selectedBooking.master?.name}</p>
                        {selectedBooking.master?.specialization && (
                          <p className="text-sm text-gray-600 font-medium">{selectedBooking.master.specialization}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date and Time */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Дата и время</h3>
                    <p className="text-gray-900 font-semibold text-lg">{formatDate(selectedBooking.start_at)}</p>
                    <p className="text-gray-700 text-sm mt-1 font-medium">
                      {formatTime(selectedBooking.start_at)} - {formatTime(selectedBooking.end_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Notes */}
              {selectedBooking.client_notes && (
                <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2 text-base">Пожелания клиента</h3>
                      <p className="text-blue-800 leading-relaxed">{selectedBooking.client_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t-2 border-pink-100 pt-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Действия</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedBooking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleConfirmBooking(selectedBooking.id)
                          setShowDetailModal(false)
                        }}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 font-semibold shadow-lg"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        Подтвердить запись
                      </button>
                      <button
                        onClick={() => {
                          handleCancelBooking(selectedBooking.id)
                          setShowDetailModal(false)
                        }}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Отменить запись
                      </button>
                    </>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => {
                          handleCompleteBooking(selectedBooking.id)
                          setShowDetailModal(false)
                        }}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Завершить запись
                      </button>
                      <button
                        onClick={() => {
                          handleNoShowBooking(selectedBooking.id)
                          setShowDetailModal(false)
                        }}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
                      >
                        <UserX className="w-5 h-5 mr-2" />
                        Клиент не пришел
                      </button>
                      <button
                        onClick={() => {
                          handleCancelBooking(selectedBooking.id)
                          setShowDetailModal(false)
                        }}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Отменить запись
                      </button>
                    </>
                  )}
                  {(selectedBooking.status === 'completed' ||
                    selectedBooking.status === 'cancelled_by_client' ||
                    selectedBooking.status === 'cancelled_by_salon' ||
                    selectedBooking.status === 'no_show') && (
                    <div className="bg-gray-100 rounded-xl p-4 border border-gray-300">
                      <p className="text-gray-700 font-medium">Эта запись завершена, дальнейшие действия недоступны</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
