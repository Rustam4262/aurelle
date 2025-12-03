import { Star, User } from 'lucide-react'
import { DetailedReview } from '../../api/reviews'

interface Props {
  review: DetailedReview
  index?: number
}

export default function ReviewCard({ review, index = 0 }: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {review.client?.name ? review.client.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
          </div>

          {/* Client info */}
          <div>
            <h4 className="font-bold text-gray-900">{review.client?.name || 'Клиент'}</h4>
            <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-2 rounded-full border border-yellow-200">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-1 font-bold text-gray-900">{review.rating}</span>
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-gray-700 leading-relaxed">{review.comment}</p>
        </div>
      )}
    </div>
  )
}
