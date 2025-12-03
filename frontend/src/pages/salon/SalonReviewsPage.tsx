import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Star, User, Calendar } from 'lucide-react'
import { salonsApi } from '../../api/salons'
import { reviewsApi, DetailedReview } from '../../api/reviews'
import { Salon } from '../../api/types'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export default function SalonReviewsPage() {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [reviews, setReviews] = useState<DetailedReview[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Загрузить салон
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const mySalon = salons[0]
        setSalon(mySalon)

        // Загрузить отзывы
        const reviewsData = await reviewsApi.getReviewsDetailed({
          salon_id: mySalon.id,
          limit: 100
        })
        setReviews(reviewsData)

        // Подсчитать статистику
        calculateStats(reviewsData, mySalon.rating, mySalon.reviews_count)
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
      alert('Не удалось загрузить отзывы')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (reviewsData: DetailedReview[], avgRating: number, totalCount: number) => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

    reviewsData.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++
      }
    })

    setStats({
      averageRating: avgRating,
      totalReviews: totalCount,
      ratingDistribution: distribution
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRatingPercentage = (rating: number) => {
    if (stats.totalReviews === 0) return 0
    return (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка отзывов...</p>
        </div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">У вас пока нет зарегистрированных салонов</p>
          <Link
            to="/salon/create"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Создать салон
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/salon/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к панели
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Star className="w-8 h-8 mr-3 text-yellow-400 fill-current" />
            Отзывы о салоне
          </h1>
          <p className="text-gray-600 mt-2">{salon.name}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Статистика */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Общая статистика</h2>

              {/* Средний рейтинг */}
              <div className="text-center mb-6 pb-6 border-b">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {stats.averageRating.toFixed(1)}
                </div>
                {renderStars(Math.round(stats.averageRating))}
                <p className="text-gray-600 text-sm mt-2">
                  На основе {stats.totalReviews} отзывов
                </p>
              </div>

              {/* Распределение оценок */}
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 w-12">
                      {rating} <Star className="w-3 h-3 inline text-yellow-400 fill-current" />
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getRatingPercentage(rating)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Список отзывов */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Все отзывы ({reviews.length})</h2>
              </div>

              {reviews.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Пока нет отзывов</p>
                  <p className="text-sm">Отзывы появятся после завершения первых записей</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.client?.name || 'Клиент'}
                            </p>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(parseISO(review.created_at), 'd MMMM yyyy', { locale: ru })}
                            </div>
                          </div>
                        </div>
                        {renderStars(review.rating)}
                      </div>

                      {review.comment && (
                        <p className="text-gray-700 mt-3 leading-relaxed">{review.comment}</p>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Запись #{review.booking_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
