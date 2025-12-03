import { useState } from 'react'
import { X, Star, Send } from 'lucide-react'
import { reviewsApi, ReviewCreate } from '../../api/reviews'

interface Props {
  bookingId: number
  salonName: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreateReviewModal({ bookingId, salonName, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Пожалуйста, выберите оценку')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const reviewData: ReviewCreate = {
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined
      }

      await reviewsApi.createReview(reviewData)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating review:', err)
      setError(err.response?.data?.detail || 'Не удалось создать отзыв')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Оставить отзыв</h2>
            <p className="text-pink-100 text-sm mt-1">{salonName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Rating */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Ваша оценка *
            </label>
            <div className="flex items-center gap-2 justify-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transform hover:scale-125 transition-transform duration-200"
                >
                  <Star
                    className={`w-12 h-12 ${
                      value <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    } transition-colors duration-150`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center mt-3 text-lg font-bold text-gray-900">
              {rating === 5 && '⭐ Отлично!'}
              {rating === 4 && '👍 Хорошо'}
              {rating === 3 && '😐 Нормально'}
              {rating === 2 && '😕 Плохо'}
              {rating === 1 && '👎 Ужасно'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Ваш отзыв
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder="Расскажите о вашем опыте посещения салона..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              {comment.length} / 500 символов
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Отправить отзыв
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
