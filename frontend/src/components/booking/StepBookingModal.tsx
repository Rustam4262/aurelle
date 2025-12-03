import { useState, useEffect } from 'react'
import { X, Check, Calendar, User, Clock, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react'
import { Service, Master, Salon } from '../../api/types'
import { servicesApi } from '../../api/services'
import { mastersApi } from '../../api/masters'
import { serviceMastersApi } from '../../api/serviceMasters'
import { availabilityApi, TimeSlot } from '../../api/availability'
import { bookingsApi } from '../../api/bookings'
import { format, addDays, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

interface Props {
  salon: Salon
  preSelectedServiceId?: number
  onClose: () => void
  onSuccess: () => void
}

type Step = 1 | 2 | 3 | 4

export default function StepBookingModal({ salon, preSelectedServiceId, onClose, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Services
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  // Step 2: Masters
  const [availableMasters, setAvailableMasters] = useState<Master[]>([])
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)

  // Step 3: Date & Time
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Step 4: Notes
  const [notes, setNotes] = useState('')

  // Load services on mount
  useEffect(() => {
    loadServices()
  }, [])

  // Pre-select service if provided
  useEffect(() => {
    if (preSelectedServiceId && services.length > 0) {
      const service = services.find(s => s.id === preSelectedServiceId)
      if (service) {
        setSelectedService(service)
      }
    }
  }, [preSelectedServiceId, services])

  // Load masters when service is selected
  useEffect(() => {
    if (selectedService) {
      loadMastersForService(selectedService.id)
    }
  }, [selectedService])

  // Load time slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedMaster && selectedService) {
      loadTimeSlots()
    }
  }, [selectedDate, selectedMaster, selectedService])

  const loadServices = async () => {
    try {
      setLoading(true)
      const data = await servicesApi.getServices({ salon_id: salon.id, limit: 50 })
      setServices(data)
    } catch (err) {
      console.error('Error loading services:', err)
      setError('Не удалось загрузить услуги')
    } finally {
      setLoading(false)
    }
  }

  const loadMastersForService = async (serviceId: number) => {
    try {
      setLoading(true)
      const masterIds = await serviceMastersApi.getMastersByService(serviceId)
      const allMasters = await mastersApi.getMasters({ salon_id: salon.id, limit: 50 })
      const filteredMasters = allMasters.filter(m => masterIds.includes(m.id) && m.is_active)
      setAvailableMasters(filteredMasters)
    } catch (err) {
      console.error('Error loading masters:', err)
      setError('Не удалось загрузить мастеров')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeSlots = async () => {
    if (!selectedMaster || !selectedService || !selectedDate) return

    try {
      setSlotsLoading(true)
      const response = await availabilityApi.getAvailableSlots({
        master_id: selectedMaster.id,
        date: selectedDate,
        service_duration: selectedService.duration_minutes,
      })
      setAvailableSlots(response.slots)
    } catch (err) {
      console.error('Error loading time slots:', err)
      setError('Не удалось загрузить доступные времена')
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedService) {
      setError('Выберите услугу')
      return
    }
    if (currentStep === 2 && !selectedMaster) {
      setError('Выберите мастера')
      return
    }
    if (currentStep === 3 && (!selectedDate || !selectedTime)) {
      setError('Выберите дату и время')
      return
    }

    setError(null)
    setCurrentStep((currentStep + 1) as Step)
  }

  const handlePrevStep = () => {
    setError(null)
    setCurrentStep((currentStep - 1) as Step)
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedMaster || !selectedDate || !selectedTime) {
      setError('Заполните все поля')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await bookingsApi.createBooking({
        service_id: selectedService.id,
        master_id: selectedMaster.id,
        start_at: `${selectedDate}T${selectedTime}:00`,
        client_notes: notes.trim() || undefined,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating booking:', err)
      setError(err.response?.data?.detail || 'Не удалось создать запись')
    } finally {
      setLoading(false)
    }
  }

  const generateNextDays = (count: number = 7) => {
    const days = []
    for (let i = 0; i < count; i++) {
      days.push(addDays(new Date(), i))
    }
    return days
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Выберите услугу'
      case 2: return 'Выберите мастера'
      case 3: return 'Выберите дату и время'
      case 4: return 'Подтверждение'
      default: return ''
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with stepper */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{salon.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    currentStep >= step
                      ? 'bg-white text-pink-500 shadow-lg scale-110'
                      : 'bg-white/30 text-white'
                  }`}
                >
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      currentStep > step ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="text-pink-100 text-center mt-3 font-medium">{getStepTitle()}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Services */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedService?.id === service.id
                      ? 'border-pink-500 bg-pink-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{service.title}</h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
                          <DollarSign className="w-4 h-4" />
                          {service.price} ₽
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {service.duration_minutes} мин
                        </span>
                      </div>
                    </div>
                    {selectedService?.id === service.id && (
                      <Check className="w-6 h-6 text-pink-500 flex-shrink-0 ml-4" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Masters */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {availableMasters.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Мастера не найдены для этой услуги</p>
                </div>
              ) : (
                availableMasters.map((master) => (
                  <button
                    key={master.id}
                    onClick={() => setSelectedMaster(master)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedMaster?.id === master.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {master.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{master.name}</h3>
                          {master.specialization && (
                            <p className="text-sm text-gray-600">{master.specialization}</p>
                          )}
                        </div>
                      </div>
                      {selectedMaster?.id === master.id && (
                        <Check className="w-6 h-6 text-purple-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Date & Time */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Date selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Выберите дату
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {generateNextDays().map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const isSelected = selectedDate === dateStr
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50 shadow-lg scale-110'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <div className={`text-xs ${isSelected ? 'text-pink-600' : 'text-gray-600'}`}>
                          {format(day, 'EEE', { locale: ru })}
                        </div>
                        <div className={`text-lg font-bold ${isSelected ? 'text-pink-600' : 'text-gray-900'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-pink-600' : 'text-gray-600'}`}>
                          {format(day, 'MMM', { locale: ru })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time selection */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Выберите время
                  </label>
                  {slotsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-600">Нет доступных времен на эту дату</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            selectedTime === slot.time
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-110'
                              : slot.available
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-200">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Детали записи</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-pink-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Услуга</p>
                      <p className="font-semibold text-gray-900">{selectedService?.title}</p>
                      <p className="text-sm text-pink-600">{selectedService?.price} ₽ • {selectedService?.duration_minutes} мин</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Мастер</p>
                      <p className="font-semibold text-gray-900">{selectedMaster?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-pink-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Дата и время</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDate && format(parseISO(selectedDate), 'd MMMM yyyy', { locale: ru })} в {selectedTime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Примечания (опционально)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Особые пожелания или комментарии..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-3xl">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Назад
              </button>
            )}
            {currentStep < 4 ? (
              <button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !selectedService) ||
                  (currentStep === 2 && !selectedMaster) ||
                  (currentStep === 3 && (!selectedDate || !selectedTime))
                }
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Далее
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Подтвердить запись'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
