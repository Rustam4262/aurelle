import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader } from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import { apiClient } from '../api/client'

interface TimeSlot {
  time: string
  available: boolean
  booking_id?: number
}

interface AvailabilityResponse {
  date: string
  master_id: number
  service_duration: number
  slots: TimeSlot[]
}

interface SlotPickerProps {
  masterId: number
  serviceDuration: number
  onSelectSlot: (date: string, time: string) => void
  selectedDate?: string
  selectedTime?: string
}

export default function SlotPicker({
  masterId,
  serviceDuration,
  onSelectSlot,
  selectedDate,
  selectedTime
}: SlotPickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDay, setSelectedDay] = useState<Date | null>(selectedDate ? parseISO(selectedDate) : null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getWeekDays = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i))
    }
    return days
  }

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7))
  }

  const loadSlotsForDay = async (day: Date) => {
    try {
      setLoading(true)
      setError(null)

      const dateStr = format(day, 'yyyy-MM-dd')
      const response = await apiClient.get<AvailabilityResponse>('/availability/available-slots', {
        params: {
          master_id: masterId,
          date: dateStr,
          service_duration: serviceDuration
        }
      })

      setAvailableSlots(response.data.slots)
    } catch (err) {
      console.error('Error loading slots:', err)
      setError('Не удалось загрузить доступные слоты')
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDay) {
      loadSlotsForDay(selectedDay)
    }
  }, [selectedDay, masterId, serviceDuration])

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day)
  }

  const handleSlotSelect = (time: string) => {
    if (selectedDay) {
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      onSelectSlot(dateStr, time)
    }
  }

  const weekDays = getWeekDays()
  const today = new Date()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <Calendar className="w-5 h-5 mr-2 text-primary-600" />
          Выберите дату и время
        </h3>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousWeek}
            disabled={isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-medium text-gray-700">
            {format(weekDays[0], 'd MMM', { locale: ru })} - {format(weekDays[6], 'd MMM yyyy', { locale: ru })}
          </span>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, today)
            const isPast = day < today && !isToday
            const isSelected = selectedDay && isSameDay(day, selectedDay)

            return (
              <button
                key={index}
                onClick={() => !isPast && handleDaySelect(day)}
                disabled={isPast}
                className={`p-3 rounded-lg text-center transition-all ${
                  isPast
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    : isSelected
                    ? 'bg-primary-600 text-white ring-2 ring-primary-600'
                    : isToday
                    ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-medium uppercase">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div className="text-lg font-bold mt-1">
                  {format(day, 'd')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDay && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary-600" />
            Доступное время на {format(selectedDay, 'd MMMM', { locale: ru })}
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary-600" />
              <span className="ml-2 text-gray-600">Загрузка слотов...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Нет доступных слотов на эту дату</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableSlots.map((slot, index) => {
                const isSelectedSlot = selectedTime === slot.time

                return (
                  <button
                    key={index}
                    onClick={() => slot.available && handleSlotSelect(slot.time)}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg text-center font-medium transition-all ${
                      !slot.available
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isSelectedSlot
                        ? 'bg-primary-600 text-white ring-2 ring-primary-600'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
          )}

          {availableSlots.length > 0 && (
            <div className="mt-4 flex items-start text-sm text-gray-600">
              <div className="flex items-center mr-4">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded mr-2"></div>
                <span>Доступно</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
                <span>Занято</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
