import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import { Salon } from '../../api/types'
import { Star, MapPin, Phone, ArrowLeft } from 'lucide-react'

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadSalon(parseInt(id))
    }
  }, [id])

  const loadSalon = async (salonId: number) => {
    try {
      const data = await salonsApi.getSalon(salonId)
      setSalon(data)
    } catch (error) {
      console.error('Error loading salon:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>
  }

  if (!salon) {
    return <div className="min-h-screen flex items-center justify-center">Салон не найден</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/client/salons" className="flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад к списку
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header Image */}
          <div className="h-64 bg-gray-200 flex items-center justify-center">
            {salon.logo_url ? (
              <img src={salon.logo_url} alt={salon.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">Фото салона</span>
            )}
          </div>

          {/* Info */}
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{salon.name}</h1>
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                  <span className="font-semibold text-lg">{salon.rating.toFixed(1)}</span>
                  <span className="text-gray-600 ml-1">({salon.reviews_count} отзывов)</span>
                </div>
              </div>
              {salon.is_verified && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  Проверенный
                </span>
              )}
            </div>

            {salon.description && (
              <p className="text-gray-700 mb-6">{salon.description}</p>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-semibold">Адрес</p>
                  <p className="text-gray-600">{salon.address}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-semibold">Телефон</p>
                  <p className="text-gray-600">{salon.phone}</p>
                </div>
              </div>
            </div>

            <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700">
              Записаться онлайн
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
