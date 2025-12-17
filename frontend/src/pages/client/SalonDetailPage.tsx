import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import { servicesApi } from '../../api/services'
import { mastersApi } from '../../api/masters'
import { bookingsApi } from '../../api/bookings'
import { serviceMastersApi } from '../../api/serviceMasters'
import { Salon, Service, Master } from '../../api/types'
import { Star, MapPin, Phone, ArrowLeft, User, Clock, X, Users, MessageCircle } from 'lucide-react'
import ErrorAlert from '../../components/ErrorAlert'
// import ReviewsList from '../../components/reviews/ReviewsList'  // MVP: disabled
import PhotoGallery from '../../components/gallery/PhotoGallery'
// import ChatModal from '../../components/chat/ChatModal'  // MVP: disabled
import SlotPicker from '../../components/SlotPicker'
import { formatPrice } from '../../utils/currency'

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Хранилище ID мастеров для каждой услуги
  const [serviceMastersMap, setServiceMastersMap] = useState<Record<number, number[]>>({})

  // Модальное окно для записи
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)
  const [availableMastersForService, setAvailableMastersForService] = useState<Master[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  // MVP: Chat modal disabled
  // const [showChatModal, setShowChatModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadSalonData(parseInt(id))
    }
  }, [id])

  const loadSalonData = async (salonId: number) => {
    try {
      setError(null)
      const [salonData, servicesData, mastersData] = await Promise.all([
        salonsApi.getSalon(salonId),
        servicesApi.getServices({ salon_id: salonId, limit: 50 }),
        mastersApi.getMasters({ salon_id: salonId, limit: 20 })
      ])

      setSalon(salonData)
      setServices(servicesData)
      setMasters(mastersData)

      // Загрузить мастеров для каждой услуги
      const serviceMastersData: Record<number, number[]> = {}
      await Promise.all(
        servicesData.map(async (service) => {
          try {
            const masterIds = await serviceMastersApi.getMastersByService(service.id)
            serviceMastersData[service.id] = masterIds
          } catch (error) {
            console.error(`Error loading masters for service ${service.id}:`, error)
            serviceMastersData[service.id] = []
          }
        })
      )
      setServiceMastersMap(serviceMastersData)
    } catch (error) {
      console.error('Error loading salon data:', error)
      setError('Не удалось загрузить информацию о салоне. Попробуйте обновить страницу.')
    } finally {
      setLoading(false)
    }
  }

  const handleBookService = (service: Service) => {
    // Получить ID мастеров для этой услуги
    const masterIdsForService = serviceMastersMap[service.id] || []

    // Проверить, есть ли назначенные мастера
    if (masterIdsForService.length === 0) {
      setError('К сожалению, для этой услуги пока не назначены мастера. Попробуйте другую услугу или свяжитесь с салоном.')
      return
    }

    // Фильтровать мастеров, которые предоставляют эту услугу
    const availableMasters = masters.filter(master =>
      masterIdsForService.includes(master.id) && master.is_active
    )

    if (availableMasters.length === 0) {
      setError('К сожалению, нет доступных мастеров для этой услуги.')
      return
    }

    setSelectedService(service)
    setAvailableMastersForService(availableMasters)
    setSelectedMaster(availableMasters[0]) // Выбираем первого доступного мастера
    setShowBookingModal(true)
  }

  const handleCreateBooking = async () => {
    if (!selectedService || !selectedMaster || !selectedDate || !selectedTime) {
      setError('Пожалуйста, заполните все поля для записи')
      return
    }

    setBookingLoading(true)
    setError(null)

    try {
      const startAt = new Date(`${selectedDate}T${selectedTime}:00`)

      await bookingsApi.createBooking({
        service_id: selectedService.id,
        master_id: selectedMaster.id,
        start_at: startAt.toISOString(),
        client_notes: bookingNotes
      })

      alert('Запись успешно создана! Ожидайте подтверждения от салона.')
      setShowBookingModal(false)
      resetBookingForm()
    } catch (error: any) {
      console.error('Error creating booking:', error)
      setError(error.response?.data?.detail || 'Ошибка при создании записи. Попробуйте еще раз.')
    } finally {
      setBookingLoading(false)
    }
  }

  const resetBookingForm = () => {
    setSelectedService(null)
    setSelectedMaster(null)
    setAvailableMastersForService([])
    setSelectedDate('')
    setSelectedTime('')
    setBookingNotes('')
  }

  const handleSlotSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
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
        {/* Error Alert */}
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* Информация о салоне */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="h-64 bg-gradient-to-r from-primary-400 to-primary-600 flex items-center justify-center">
            {salon.external_photo_url || salon.logo_url ? (
              <img
                src={salon.external_photo_url || salon.logo_url}
                alt={salon.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-center">
                <h1 className="text-4xl font-bold mb-2">{salon.name}</h1>
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{salon.name}</h1>
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                  <span className="font-semibold text-lg">{(salon.rating ?? 0).toFixed(1)}</span>
                  <span className="text-gray-600 ml-1">({salon.reviews_count ?? 0} отзывов)</span>
                </div>
              </div>
              {salon.is_verified && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  ✓ Проверенный
                </span>
              )}
            </div>

            {salon.description && (
              <p className="text-gray-700 mb-6">{salon.description}</p>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
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

            {/* MVP: Chat disabled */}
            {/* <button
              onClick={() => setShowChatModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              Написать салону
            </button> */}
          </div>
        </div>

        {/* Фото-галерея */}
        {salon && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Портфолио и фотографии</h2>
            <PhotoGallery
              photos={[
                // Пока используем заглушки - в будущем это будут реальные фотографии из базы
                ...(salon.logo_url ? [{
                  id: 1,
                  url: salon.logo_url,
                  caption: `Логотип ${salon.name}`
                }] : []),
                ...(salon.external_photo_url ? [{
                  id: 2,
                  url: salon.external_photo_url,
                  caption: `${salon.name}`
                }] : [])
              ]}
              salonName={salon.name}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Мастера */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <User className="w-6 h-6 mr-2 text-primary-600" />
                Наши мастера
              </h2>

              {masters.length === 0 ? (
                <p className="text-gray-600">Мастера пока не добавлены</p>
              ) : (
                <div className="space-y-4">
                  {masters.map((master) => (
                    <div key={master.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          {master.avatar_url ? (
                            <img src={master.avatar_url} alt={master.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-primary-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{master.name}</h3>
                          {master.specialization && (
                            <p className="text-sm text-gray-600">{master.specialization}</p>
                          )}
                          {master.experience_years > 0 && (
                            <p className="text-xs text-gray-500">Опыт: {master.experience_years} лет</p>
                          )}
                          <div className="flex items-center mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-sm font-semibold">{(master.rating ?? 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Услуги */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">Услуги и цены</h2>

              {services.length === 0 ? (
                <p className="text-gray-600">Услуги пока не добавлены</p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => {
                    const masterCount = (serviceMastersMap[service.id] || []).length
                    const hasAvailableMasters = masterCount > 0

                    return (
                      <div key={service.id} className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{service.title}</h3>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{service.duration_minutes} мин</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{masterCount} {masterCount === 1 ? 'мастер' : 'мастеров'}</span>
                              </div>
                              {service.category && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {service.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold text-primary-600">
                              {formatPrice(service.price)}
                            </p>
                            <button
                              onClick={() => handleBookService(service)}
                              disabled={!hasAvailableMasters}
                              className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                hasAvailableMasters
                                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={!hasAvailableMasters ? 'Нет доступных мастеров для этой услуги' : ''}
                            >
                              {hasAvailableMasters ? 'Записаться' : 'Недоступно'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MVP: Reviews disabled until post-launch */}
        {/* <div className="mt-8">
          {salon && <ReviewsList salonId={salon.id} />}
        </div> */}
      </div>

      {/* Модальное окно для записи */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Запись на услугу</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Выбранная услуга */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Услуга</p>
                  <p className="font-semibold">{selectedService.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedService.duration_minutes} мин • {formatPrice(selectedService.price)}
                  </p>
                </div>

                {/* Выбор мастера */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите мастера
                  </label>
                  <select
                    value={selectedMaster?.id || ''}
                    onChange={(e) => {
                      const master = availableMastersForService.find(m => m.id === parseInt(e.target.value))
                      setSelectedMaster(master || null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {availableMastersForService.map((master) => (
                      <option key={master.id} value={master.id}>
                        {master.name} {master.specialization && `- ${master.specialization}`}
                      </option>
                    ))}
                  </select>
                  {availableMastersForService.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Доступно мастеров: {availableMastersForService.length}
                    </p>
                  )}
                </div>

                {/* Выбор даты и времени через SlotPicker */}
                {selectedMaster && selectedService && (
                  <SlotPicker
                    masterId={selectedMaster.id}
                    serviceDuration={selectedService.duration_minutes}
                    onSelectSlot={handleSlotSelect}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                  />
                )}

                {/* Примечания */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Примечания (опционально)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Особые пожелания или комментарии..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Кнопки */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateBooking}
                    disabled={bookingLoading || !selectedDate || !selectedTime}
                    className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Создание...' : 'Подтвердить запись'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MVP: Chat Modal disabled */}
      {/* {showChatModal && salon && (
        <ChatModal
          receiverId={salon.owner_id}
          receiverName={salon.name}
          salonId={salon.id}
          salonName={salon.name}
          onClose={() => setShowChatModal(false)}
        />
      )} */}
    </div>
  )
}
