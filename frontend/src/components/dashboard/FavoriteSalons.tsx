import { Link } from 'react-router-dom'
import { Star, MapPin, ArrowRight } from 'lucide-react'
import { Salon } from '../../api/types'

interface Props {
  salons: Salon[]
}

export default function FavoriteSalons({ salons }: Props) {
  if (salons.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold mb-6">Избранные салоны</h2>
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Star className="w-12 h-12 text-pink-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Добавьте салоны в избранное
          </h3>
          <p className="text-gray-600 mb-6">
            Сохраняйте любимые салоны для быстрого доступа
          </p>
          <Link
            to="/client/salons"
            className="inline-block bg-pink-500 text-white px-8 py-3 rounded-xl hover:bg-pink-600 transition-colors font-semibold"
          >
            Найти салон
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Избранные салоны</h2>
        <Link
          to="/client/favorites"
          className="flex items-center text-pink-500 hover:text-pink-600 font-semibold text-sm group"
        >
          Смотреть все
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {salons.slice(0, 3).map((salon) => (
          <Link
            key={salon.id}
            to={`/client/salons/${salon.id}`}
            className="block border-2 border-gray-100 rounded-xl p-4 hover:border-pink-200 hover:bg-pink-50 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg p-2 text-white">
                <Star className="w-5 h-5" fill="white" />
              </div>
            </div>

            <h3 className="font-bold text-gray-900 mb-2 group-hover:text-pink-500 transition-colors">
              {salon.name}
            </h3>

            <div className="flex items-start text-sm text-gray-600 mb-3">
              <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2">{salon.address}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                <span className="font-bold text-gray-900">{salon.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-600 ml-1">({salon.reviews_count})</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
