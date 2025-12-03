import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../../api/bookings'
import { BookingDetailed } from '../../api/types'
import { reviewsApi } from '../../api/reviews'
import { Calendar, Clock, MapPin, User, Phone, XCircle, ArrowLeft, Star, X } from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import { BookingCardSkeleton } from '../../components/SkeletonLoader'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<BookingDetailed | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookingsApi.getMyBookingsDetailed({ limit: 100 })
      setBookings(data)
    } catch (err) {
      console.error('Error loading bookings:', err)
      setError('Не удалось загрузить записи. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Вы уверены, что хотите отменить эту запись?')) {
      return
    }

    try {
      setCancellingId(id)
      await bookingsApi.cancelBooking(id)
      // Refresh bookings list
      await loadBookings()
    } catch (err) {
      console.error('Error cancelling booking:', err)
      alert('Не удалось отменить запись. Попробуйте позже.')
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border border-green-200',
      completed: 'bg-gray-100 text-gray-800 border border-gray-200',
      cancelled_by_client: 'bg-red-100 text-red-800 border border-red-200',
      cancelled_by_salon: 'bg-red-100 text-red-800 border border-red-200',
      no_show: 'bg-gray-100 text-gray-800 border border-gray-200',
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const canCancelBooking = (booking: BookingDetailed) => {
    const isCancellable = booking.status === 'pending' || booking.status === 'confirmed'
    const isNotPast = !isPast(parseISO(booking.start_at))
    return isCancellable && isNotPast
  }

  const handleOpenReviewModal = (booking: BookingDetailed) => {
    setSelectedBookingForReview(booking)
    setReviewRating(5)
    setReviewComment('')
    setShowReviewModal(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedBookingForReview) return

    try {
      setSubmittingReview(true)
      await reviewsApi.createReview({
        booking_id: selectedBookingForReview.id,
        rating: reviewRating,
        comment: reviewComment
      })

      alert('Спасибо за ваш отзыв!')
      setShowReviewModal(false)
      setSelectedBookingForReview(null)
      setReviewRating(5)
      setReviewComment('')
    } catch (err: any) {
      console.error('Error submitting review:', err)
      alert(err.response?.data?.detail || 'Не удалось отправить отзыв. Попробуйте позже.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    return {
      date: format(date, 'd MMMM yyyy', { locale: ru }),
      time: format(date, 'HH:mm'),
      dayOfWeek: format(date, 'EEEE', { locale: ru })
    }
  }

  // Group bookings into upcoming and past
  const upcomingBookings = bookings.filter(booking => {
    const isUpcoming = !isPast(parseISO(booking.start_at))
    const isActive = booking.status === 'pending' || booking.status === 'confirmed'
    return isUpcoming && isActive
  })

  const pastBookings = bookings.filter(booking => {
    const isPastDate = isPast(parseISO(booking.start_at))
    const isCompleted = booking.status === 'completed' || booking.status === 'cancelled_by_client' ||
                       booking.status === 'cancelled_by_salon' || booking.status === 'no_show'
    return isPastDate || isCompleted
  })

  const renderBookingCard = (booking: BookingDetailed) => {
    const dateTime = formatDateTime(booking.start_at)

    return (
      <div key={booking.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        <div className="p-6">
          {/* Header with Salon Info and Status */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {booking.salon?.name || 'Салон'}
              </h3>
              <div className="flex items-start text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{booking.salon?.address || 'Адрес не указан'}</span>
              </div>
            </div>
            <div className="ml-4">
              {getStatusBadge(booking.status)}
            </div>
          </div>

          {/* Service and Master Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500 mb-1">Услуга</p>
              <p className="font-medium text-gray-900">{booking.service?.title || 'Услуга'}</p>
              <p className="text-sm text-gray-600 mt-1">
                <Clock className="w-4 h-4 inline mr-1" />
                {booking.service?.duration_minutes || 0} мин
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Мастер</p>
              <div className="flex items-start">
                <User className="w-4 h-4 mr-2 mt-1 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{booking.master?.name || 'Мастер'}</p>
                  {booking.master?.specialization && (
                    <p className="text-sm text-gray-600">{booking.master.specialization}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date, Time and Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center text-gray-700">
                <Calendar className="w-5 h-5 mr-3 text-primary-600" />
                <div>
                  <p className="font-medium">{dateTime.date}</p>
                  <p className="text-sm text-gray-600 capitalize">{dateTime.dayOfWeek}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="w-5 h-5 mr-3 text-primary-600" />
                <p className="font-medium">{dateTime.time}</p>
              </div>
            </div>
            {booking.salon?.phone && (
              <div className="flex items-center text-gray-700">
                <Phone className="w-5 h-5 mr-3 text-primary-600" />
                <p className="font-medium">{booking.salon.phone}</p>
              </div>
            )}
          </div>

          {/* Client Notes */}
          {booking.client_notes && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Примечания</p>
              <p className="text-sm text-gray-700">{booking.client_notes}</p>
            </div>
          )}

          {/* Footer with Price and Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Стоимость</p>
              <p className="text-2xl font-bold text-gray-900">{booking.price.toLocaleString()} сум</p>
            </div>
            <div className="flex gap-2">
              {booking.status === 'completed' && (
                <button
                  onClick={() => handleOpenReviewModal(booking)}
                  className="flex items-center px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Оставить отзыв
                </button>
              )}
              {canCancelBooking(booking) && (
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={cancellingId === booking.id}
                  className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {cancellingId === booking.id ? 'Отмена...' : 'Отменить'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои записи</h1>
            <p className="text-gray-600">Управляйте своими записями в салоны красоты</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <BookingCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Ошибка загрузки</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadBookings}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои записи</h1>
          <p className="text-gray-600">Управляйте своими записями в салоны красоты</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">У вас пока нет записей</h3>
            <p className="text-gray-600 mb-6">Найдите подходящий салон и запишитесь на услугу</p>
            <Link
              to="/client/salons"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Найти салон
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-primary-600" />
                  Предстоящие записи
                  <span className="ml-3 text-sm font-normal bg-primary-100 text-primary-800 px-3 py-1 rounded-full">
                    {upcomingBookings.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {upcomingBookings.map(renderBookingCard)}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-gray-600" />
                  Прошедшие записи
                  <span className="ml-3 text-sm font-normal bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                    {pastBookings.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pastBookings.map(renderBookingCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBookingForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Оставить отзыв</h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Салон</p>
                <p className="font-semibold">{selectedBookingForReview.salon?.name}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Услуга</p>
                <p className="font-semibold">{selectedBookingForReview.service?.title}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Оценка
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setReviewRating(rating)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= reviewRating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий (опционально)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Расскажите о вашем опыте..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'Отправка...' : 'Отправить отзыв'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
