import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { salonsApi, SalonMapData } from '../../api/salons'
import { favoritesApi } from '../../api/favorites'
import { Salon } from '../../api/types'
import { Star, MapPin, Search, SlidersHorizontal, Map as MapIcon, Heart } from 'lucide-react'
import SalonsMap from '../../components/SalonsMap'
import ErrorAlert from '../../components/ErrorAlert'
import { SalonCardSkeleton } from '../../components/SkeletonLoader'

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [mapSalons, setMapSalons] = useState<SalonMapData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [minRating, setMinRating] = useState<number>(0)
  const [sortBy, setSortBy] = useState<string>('rating')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showMap, setShowMap] = useState(false)  // MVP: Maps disabled by default
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [favoriteSalonIds, setFavoriteSalonIds] = useState<Set<number>>(new Set())
  const [togglingFavorite, setTogglingFavorite] = useState<number | null>(null)

  useEffect(() => {
    loadSalons()
    loadMapSalons()
    loadFavorites()
  }, [sortBy, sortOrder, minRating])

  const loadSalons = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        limit: 50,
        sort_by: sortBy,
        sort_order: sortOrder
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (minRating > 0) {
        params.min_rating = minRating
      }

      const data = await salonsApi.getSalons(params)
      setSalons(data)
    } catch (error) {
      console.error('Error loading salons:', error)
      setError('Не удалось загрузить список салонов. Попробуйте обновить страницу.')
    } finally {
      setLoading(false)
    }
  }

  const loadMapSalons = async () => {
    try {
      const data = await salonsApi.getSalonsForMap(searchQuery || undefined)
      setMapSalons(data)
    } catch (error) {
      console.error('Error loading map salons:', error)
      // Не показываем ошибку для карты, так как это второстепенная функция
    }
  }

  const loadFavorites = async () => {
    try {
      const favorites = await favoritesApi.getFavorites()
      setFavoriteSalonIds(new Set(favorites.map(salon => salon.id)))
    } catch (error) {
      console.error('Error loading favorites:', error)
      // Не показываем ошибку, так как это не критично
    }
  }

  const toggleFavorite = async (salonId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      setTogglingFavorite(salonId)
      const isFavorite = favoriteSalonIds.has(salonId)

      if (isFavorite) {
        await favoritesApi.removeFromFavorites(salonId)
        setFavoriteSalonIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(salonId)
          return newSet
        })
      } else {
        await favoritesApi.addToFavorites(salonId)
        setFavoriteSalonIds(prev => new Set(prev).add(salonId))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Не удалось обновить избранное. Попробуйте позже.')
    } finally {
      setTogglingFavorite(null)
    }
  }

  const handleSearch = () => {
    loadSalons()
    loadMapSalons()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setMinRating(0)
    setSortBy('rating')
    setSortOrder('desc')
  }

  const handleSalonCardClick = (salonId: number) => {
    setSelectedSalonId(salonId)
    setShowMap(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/client/dashboard" className="text-2xl font-bold text-primary-600">
            Beauty Salon
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Салоны красоты</h1>
          <div className="flex space-x-3">
            {/* MVP: Map toggle disabled */}
            {/* <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <MapIcon className="w-5 h-5 mr-2" />
              {showMap ? 'Скрыть карту' : 'Показать карту'}
            </button> */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Фильтры
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Sort by */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="rating">По рейтингу</option>
                  <option value="reviews_count">По количеству отзывов</option>
                  <option value="name">По названию</option>
                </select>
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Порядок
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </div>

              {/* Min rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимальный рейтинг
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="0">Любой</option>
                  <option value="3">3+ звезды</option>
                  <option value="4">4+ звезды</option>
                  <option value="4.5">4.5+ звезды</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-8 flex space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск салонов по названию или адресу..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Искать
          </button>
        </div>

        {/* Map Section */}
        {showMap && (
          <div className="mb-8 h-[500px] bg-white rounded-lg shadow-sm overflow-hidden">
            <SalonsMap
              salons={mapSalons}
              selectedSalonId={selectedSalonId}
              onMarkerClick={setSelectedSalonId}
            />
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <div className="mb-4 text-gray-600">
            Найдено салонов: <span className="font-semibold">{salons.length}</span>
          </div>
        )}

        {/* Salons Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SalonCardSkeleton key={index} />
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="text-center py-12 text-gray-600">Салоны не найдены</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => {
              const isFavorite = favoriteSalonIds.has(salon.id)
              const isToggling = togglingFavorite === salon.id

              return (
                <div
                  key={salon.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer relative"
                  onClick={() => handleSalonCardClick(salon.id)}
                >
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(salon.id, e)}
                    disabled={isToggling}
                    className="absolute top-3 right-3 z-10 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform disabled:opacity-50"
                    title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite
                          ? 'text-red-500 fill-current'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    />
                  </button>

                  <Link to={`/client/salons/${salon.id}`}>
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      {salon.external_photo_url || salon.logo_url ? (
                        <img
                          src={salon.external_photo_url || salon.logo_url}
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
                        <span className="font-semibold">
                          {salon.rating > 0 ? salon.rating.toFixed(1) : 'Нет оценок'}
                        </span>
                        {salon.rating > 0 && (
                          <span className="text-gray-600 ml-1">({salon.reviews_count})</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
