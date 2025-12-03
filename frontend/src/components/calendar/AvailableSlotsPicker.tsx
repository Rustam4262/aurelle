import { useEffect, useState } from 'react'
import { scheduleApi, AvailableSlotsResponse, TimeSlot } from '../../api/schedule'

interface AvailableSlotsPickerProps {
  masterId: number
  serviceId: number
  onSlotSelected: (date: string, startTime: string, endTime: string) => void
  selectedSlot?: { date: string; startTime: string }
}

export default function AvailableSlotsPicker({
  masterId,
  serviceId,
  onSlotSelected,
  selectedSlot
}: AvailableSlotsPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Устанавливаем сегодняшнюю дату как выбранную по умолчанию
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  useEffect(() => {
    if (selectedDate && masterId && serviceId) {
      loadAvailableSlots()
    }
  }, [selectedDate, masterId, serviceId])

  const loadAvailableSlots = async () => {
    setLoading(true)
    try {
      const data = await scheduleApi.getAvailableSlots(masterId, selectedDate, serviceId)
      setSlotsData(data)
    } catch (error) {
      console.error('Ошибка загрузки свободных слотов:', error)
      setSlotsData(null)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = () => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Генерируем 14 дней вперед
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      days.push(date)
    }

    return days
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(dateStr)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return
    onSlotSelected(selectedDate, slot.start_time, slot.end_time)
  }

  const isSlotSelected = (slot: TimeSlot): boolean => {
    return (
      selectedSlot?.date === selectedDate &&
      selectedSlot?.startTime === slot.start_time
    )
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-4">
      {/* Выбор даты */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Выберите дату</h3>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0]
            const isToday = date.getTime() === today.getTime()
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${isSelected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                  }
                  ${isToday ? 'ring-2 ring-primary-400' : ''}
                `}
              >
                <div className="text-xs text-gray-600 mb-1">
                  {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-semibold ${isSelected ? 'text-primary-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
                <div className="text-xs text-gray-500">
                  {date.toLocaleDateString('ru-RU', { month: 'short' })}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Выбор времени */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Выберите время
          {selectedDate && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              на {new Date(selectedDate).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : slotsData ? (
          <>
            {slotsData.reason ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                {slotsData.reason}
              </div>
            ) : slotsData.available_slots.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-center">
                На эту дату нет доступных слотов
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {slotsData.available_slots.map((slot, index) => {
                  const isSelected = isSlotSelected(slot)
                  return (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.available}
                      className={`
                        p-3 rounded-lg border-2 font-medium text-sm transition-all
                        ${!slot.available
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white text-gray-900 hover:border-primary-500 hover:bg-primary-50'
                        }
                      `}
                    >
                      {slot.start_time}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-center">
            Выберите дату для просмотра доступного времени
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-600 bg-primary-600 rounded"></div>
          <span>Выбрано</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded"></div>
          <span>Доступно</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-200 bg-gray-100 rounded"></div>
          <span>Занято</span>
        </div>
      </div>
    </div>
  )
}
