import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import { Salon } from '../../api/types'
import { Star, MapPin, Search } from 'lucide-react'

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadSalons()
  }, [])

  const loadSalons = async () => {
    try {
      const data = await salonsApi.getSalons({ limit: 20 })
      setSalons(data)
    } catch (error) {
      console.error('Error loading salons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const data = await salonsApi.getSalons({ search: searchQuery, limit: 20 })
      setSalons(data)
    } catch (error) {
      console.error('Error searching salons:', error)
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Салоны красоты</h1>

        {/* Search */}
        <div className="mb-8 flex space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск салонов..."
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

        {/* Salons Grid */}
        {loading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : salons.length === 0 ? (
          <div className="text-center py-12 text-gray-600">Салоны не найдены</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <Link
                key={salon.id}
                to={`/client/salons/${salon.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {salon.logo_url ? (
                    <img src={salon.logo_url} alt={salon.name} className="w-full h-full object-cover" />
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
