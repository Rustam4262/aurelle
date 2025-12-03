import { useState } from 'react'
import { Star, Send } from 'lucide-react'

interface ReviewFormProps {
  salonId: number
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>
  onCancel?: () => void
}

export default function ReviewForm({ salonId, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert('Пожалуйста, выберите оценку')
      return
    }

    if (comment.trim().length < 10) {
      alert('Отзыв должен содержать минимум 10 символов')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ rating, comment: comment.trim() })
      setRating(0)
      setComment('')
    } catch (error) {
      console.error('Error submitting review:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Оставить отзыв
      </h3>

      {/* Rating selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ваша оценка <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center space-x-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const starValue = index + 1
            return (
              <button
                key={index}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    starValue <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            )
          })}
          {rating > 0 && (
            <span className="ml-3 text-sm text-gray-600">
              {rating === 5 && 'Отлично!'}
              {rating === 4 && 'Хорошо'}
              {rating === 3 && 'Нормально'}
              {rating === 2 && 'Плохо'}
              {rating === 1 && 'Ужасно'}
            </span>
          )}
        </div>
      </div>

      {/* Comment textarea */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ваш отзыв <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="Расскажите о вашем опыте посещения салона..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Минимум 10 символов ({comment.length}/10)
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium mb-2">💡 Советы для отзыва:</p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Опишите качество обслуживания</li>
          <li>• Упомяните работу мастера</li>
          <li>• Оцените чистоту и атмосферу</li>
          <li>• Укажите соотношение цены и качества</li>
        </ul>
      </div>

      {/* Buttons */}
      <div className="flex items-center space-x-3">
        <button
          type="submit"
          disabled={submitting || rating === 0 || comment.trim().length < 10}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5 mr-2" />
          {submitting ? 'Отправка...' : 'Отправить отзыв'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
