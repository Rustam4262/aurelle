import { Link } from 'react-router-dom'
import { MapPin, Star, ArrowRight, Sparkles } from 'lucide-react'
import { Salon } from '../../api/types'

interface Props {
  salons: Salon[]
}

export default function RecommendedSalons({ salons }: Props) {
  if (salons.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-white via-pink-50 to-purple-50 rounded-2xl shadow-sm p-6 border border-pink-100">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-pink-500" />
            <h2 className="text-2xl font-bold">Рекомендации для вас</h2>
          </div>
          <p className="text-sm text-gray-600">Популярные салоны с высоким рейтингом</p>
        </div>
        <Link
          to="/client/salons"
          className="flex items-center text-pink-500 hover:text-pink-600 font-semibold text-sm group"
        >
          Все салоны
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {salons.slice(0, 3).map((salon, index) => (
          <Link
            key={salon.id}
            to={`/client/salons/${salon.id}`}
            className="group bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-pink-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.02]"
            style={{
              animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`
            }}
          >
            {/* Image */}
            <div className="h-48 bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 flex items-center justify-center overflow-hidden relative">
              {salon.logo_url || salon.external_photo_url ? (
                <>
                  <img
                    src={salon.logo_url || salon.external_photo_url || ''}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-500"
                  />
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* View details button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-90">
                    <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full font-bold text-pink-500 shadow-2xl">
                      Подробнее →
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <Sparkles className="w-12 h-12 text-white/50 mx-auto mb-2 group-hover:scale-110 group-hover:rotate-12 transition-all" />
                  <span className="text-white/70 font-semibold">{salon.name}</span>
                </div>
              )}
              {/* Rating badge */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1 group-hover:animate-pulse" />
                <span className="font-bold text-gray-900">{salon.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-pink-500 transition-colors line-clamp-1">
                {salon.name}
              </h3>

              <div className="flex items-start text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="line-clamp-2">{salon.address}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-semibold">{salon.reviews_count}</span>
                  <span className="ml-1">отзывов</span>
                </div>
                {salon.is_verified && (
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                    Проверен
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
