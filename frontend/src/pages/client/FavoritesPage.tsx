import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { favoritesApi } from '../../api/favorites'
import { Salon } from '../../api/types'
import { useAuthStore } from '../../store/authStore'
import { Star, MapPin, Heart, LogOut, ArrowLeft } from 'lucide-react'

export default function FavoritesPage() {
  const { user, logout } = useAuthStore()
  const [favorites, setFavorites] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const data = await favoritesApi.getFavorites()
      setFavorites(data)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (salonId: number) => {
    try {
      await favoritesApi.removeFromFavorites(salonId)
      setFavorites(favorites.filter(salon => salon.id !== salonId))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon</div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Привет, {user?.name}</span>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/client/dashboard"
            className="flex items-center text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад в личный кабинет
          </Link>
        </div>

        <div className="flex items-center mb-8">
          <Heart className="w-8 h-8 text-red-500 fill-current mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Избранные салоны</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              У вас пока нет избранных салонов
            </h3>
            <p className="text-gray-600 mb-6">
              Добавляйте салоны в избранное, чтобы быстро находить их позже
            </p>
            <Link
              to="/client/salons"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Найти салоны
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((salon) => (
              <div
                key={salon.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                <button
                  onClick={() => handleRemoveFavorite(salon.id)}
                  className="absolute top-3 right-3 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                  title="Удалить из избранного"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                </button>

                <Link to={`/client/salons/${salon.id}`}>
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {salon.logo_url ? (
                      <img
                        src={salon.logo_url}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">Фото</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{salon.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{salon.address}</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold">{salon.rating.toFixed(1)}</span>
                      <span className="text-gray-600 ml-1">({salon.reviews_count})</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
