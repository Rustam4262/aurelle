import { Star, ThumbsUp, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export interface Review {
  id: number
  rating: number
  comment: string
  client_name: string
  created_at: string
  salon_response?: string
  helpful_count?: number
}

interface ReviewCardProps {
  review: Review
  onHelpful?: (reviewId: number) => void
  onReply?: (reviewId: number) => void
  canReply?: boolean
}

export default function ReviewCard({ review, onHelpful, onReply, canReply }: ReviewCardProps) {
  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
    locale: ru
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
            {review.client_name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-semibold text-gray-900">{review.client_name}</p>
            <p className="text-sm text-gray-500">{timeAgo}</p>
          </div>
        </div>

        {/* Rating stars */}
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`w-5 h-5 ${
                index < review.rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      <p className="text-gray-700 mb-4">{review.comment}</p>

      {/* Salon Response */}
      {review.salon_response && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-primary-500">
          <div className="flex items-center mb-2">
            <MessageCircle className="w-4 h-4 text-primary-600 mr-2" />
            <p className="text-sm font-semibold text-gray-900">Ответ салона:</p>
          </div>
          <p className="text-sm text-gray-700">{review.salon_response}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-4 text-sm">
        {onHelpful && (
          <button
            onClick={() => onHelpful(review.id)}
            className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            <span>Полезно {review.helpful_count ? `(${review.helpful_count})` : ''}</span>
          </button>
        )}

        {canReply && !review.salon_response && onReply && (
          <button
            onClick={() => onReply(review.id)}
            className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            <span>Ответить</span>
          </button>
        )}
      </div>
    </div>
  )
}
