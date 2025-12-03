import { useState, useEffect } from 'react'
import { Calendar, MapPin, User, DollarSign, Clock, MessageSquare, Star } from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { BookingDetailed } from '../../api/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import CreateReviewModal from '../reviews/CreateReviewModal'

export default function VisitHistory() {
  const [visits, setVisits] = useState<BookingDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailed | null>(null)

  useEffect(() => {
    loadVisitHistory()
  }, [])

  const loadVisitHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get completed bookings
      const bookings = await bookingsApi.getMyBookingsDetailed({
        status_filter: 'completed',
        limit: 50,
      })

      // Sort by date descending (most recent first)
      const sortedBookings = bookings.sort((a: BookingDetailed, b: BookingDetailed) => {
        return new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      })

      setVisits(sortedBookings)
    } catch (err) {
      console.error('Error loading visit history:', err)
      setError('Не удалось загрузить историю посещений')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: ru })
  }

  const formatTime = (iso: string) => {
    return format(new Date(iso), 'HH:mm', { locale: ru })
  }

  const handleLeaveReview = (booking: BookingDetailed) => {
    setSelectedBooking(booking)
    setShowReviewModal(true)
  }

  const handleReviewSuccess = () => {
    // Reload visits to update review status
    loadVisitHistory()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (visits.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-pink-50 rounded-2xl p-12 text-center border border-gray-200">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">История пуста</h3>
        <p className="text-gray-600">У вас пока нет завершенных посещений</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-pink-500" />
          История посещений
        </h2>
        <span className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-4 py-2 rounded-full text-sm font-bold">
          {visits.length} {visits.length === 1 ? 'визит' : 'визитов'}
        </span>
      </div>

      {visits.map((visit, index) => (
        <div
          key={visit.id}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
          style={{
            animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
          }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Salon Logo/Image */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {visit.salon?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
            </div>

            {/* Visit Details */}
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {visit.salon?.name || 'Салон'}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(visit.start_at)} в {formatTime(visit.start_at)}
                  </p>
                </div>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                  ✓ Завершено
                </span>
              </div>

              {/* Service & Master */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-5 h-5 text-pink-500" />
                  <div>
                    <p className="text-sm font-semibold">{visit.service?.title || 'Услуга'}</p>
                    <p className="text-xs text-gray-500">
                      {visit.price ? `${visit.price} ₽` : 'Цена не указана'}
                    </p>
                  </div>
                </div>

                {visit.master && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-semibold">Мастер: {visit.master.name}</p>
                      <p className="text-xs text-gray-500">{visit.master.specialization}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              {visit.salon?.address && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                  <p className="text-sm">{visit.salon.address}</p>
                </div>
              )}

              {/* Duration */}
              {visit.service?.duration_minutes && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">Длительность: {visit.service.duration_minutes} мин</p>
                </div>
              )}

              {/* Notes */}
              {visit.client_notes && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Примечания:</p>
                      <p className="text-sm text-gray-600">{visit.client_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleLeaveReview(visit)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                >
                  <Star className="w-4 h-4" />
                  Оставить отзыв
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Review Modal */}
      {showReviewModal && selectedBooking && selectedBooking.salon && (
        <CreateReviewModal
          bookingId={selectedBooking.id}
          salonName={selectedBooking.salon.name}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedBooking(null)
          }}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  )
}
