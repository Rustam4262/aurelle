import { useEffect, useState } from 'react'
import { scheduleApi, MasterBooking } from '../../api/schedule'

interface MasterCalendarProps {
  masterId: number
}

interface CalendarDay {
  date: Date
  dateStr: string
  bookings: MasterBooking[]
  isToday: boolean
  isCurrentMonth: boolean
}

export default function MasterCalendar({ masterId }: MasterCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<MasterBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Загрузка бронирований
  useEffect(() => {
    loadBookings()
  }, [masterId, currentDate])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const fromDate = firstDay.toISOString().split('T')[0]
      const toDate = lastDay.toISOString().split('T')[0]

      const data = await scheduleApi.getMasterBookings(masterId, fromDate, toDate)
      setBookings(data)
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error)
    } finally {
      setLoading(false)
    }
  }

  // Генерация дней календаря
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const prevMonthLastDay = new Date(year, month, 0)

    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Дни предыдущего месяца
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Понедельник = 0
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        bookings: getBookingsForDate(dateStr),
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth: false
      })
    }

    // Дни текущего месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        bookings: getBookingsForDate(dateStr),
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth: true
      })
    }

    // Дни следующего месяца
    const remainingDays = 42 - days.length // 6 недель по 7 дней
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        bookings: getBookingsForDate(dateStr),
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth: false
      })
    }

    return days
  }

  const getBookingsForDate = (dateStr: string): MasterBooking[] => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_at).toISOString().split('T')[0]
      return bookingDate === dateStr
    })
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      confirmed: 'Подтверждено',
      pending: 'Ожидает',
      completed: 'Завершено',
      cancelled: 'Отменено'
    }
    return statusMap[status] || status
  }

  const calendarDays = generateCalendarDays()
  const selectedDayData = selectedDate ? calendarDays.find(d => d.dateStr === selectedDate) : null

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Заголовок календаря */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            ← Пред
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            След →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="p-4">
          {/* Заголовки дней недели */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Дни календаря */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${day.isToday ? 'ring-2 ring-primary-500' : ''}
                  ${selectedDate === day.dateStr ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}
                `}
              >
                <div className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.bookings.slice(0, 3).map(booking => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 rounded border ${getStatusColor(booking.status)}`}
                      title={`${booking.client_name} - ${booking.service_title}`}
                    >
                      <div className="font-medium truncate">{formatTime(booking.start_at)}</div>
                      <div className="truncate">{booking.client_name}</div>
                    </div>
                  ))}
                  {day.bookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{day.bookings.length - 3} ещё
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Детали выбранного дня */}
      {selectedDayData && selectedDayData.bookings.length > 0 && (
        <div className="border-t p-4 bg-gray-50">
          <h3 className="font-semibold text-lg mb-3">
            Записи на {selectedDayData.date.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedDayData.bookings
              .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
              .map(booking => (
                <div
                  key={booking.id}
                  className={`p-3 rounded-lg border ${getStatusColor(booking.status)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{formatTime(booking.start_at)}</div>
                      <div className="text-sm">{booking.duration_minutes} мин</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-white">
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{booking.client_name}</div>
                    {booking.client_phone && (
                      <div className="text-gray-600">{booking.client_phone}</div>
                    )}
                    <div className="text-gray-700">{booking.service_title}</div>
                    <div className="font-medium text-primary-600">
                      {booking.total_price.toLocaleString()} сум
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
