import { useState, useEffect } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import { reviewsApi, DetailedReview } from '../../api/reviews'
import ReviewCard from './ReviewCard'

interface Props {
  salonId: number
}

export default function ReviewsList({ salonId }: Props) {
  const [reviews, setReviews] = useState<DetailedReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReviews()
  }, [salonId])

  const loadReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reviewsApi.getReviewsDetailed({ salon_id: salonId, limit: 50 })
      setReviews(data)
    } catch (err) {
      console.error('Error loading reviews:', err)
      setError('Не удалось загрузить отзывы')
    } finally {
      setLoading(false)
    }
  }

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
    return { rating, count, percentage }
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
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

  if (reviews.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-pink-50 rounded-2xl p-12 text-center border border-gray-200">
        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Пока нет отзывов</h3>
        <p className="text-gray-600">Станьте первым, кто оставит отзыв об этом салоне!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 rounded-2xl p-6 shadow-sm border border-yellow-100">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start mb-4">
              <div className="text-6xl font-bold text-gray-900">{averageRating}</div>
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.round(parseFloat(averageRating))
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">{reviews.length} отзывов</p>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium text-gray-700">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-pink-500" />
          Отзывы клиентов
        </h3>
        {reviews.map((review, index) => (
          <ReviewCard key={review.id} review={review} index={index} />
        ))}
      </div>
    </div>
  )
}
