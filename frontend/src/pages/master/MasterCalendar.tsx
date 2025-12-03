import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { masterDashboardApi, CalendarData, CalendarBooking } from '../../api/masterDashboard'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export default function MasterCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)

  useEffect(() => {
    loadCalendarData()
  }, [currentDate])

  const loadCalendarData = async () => {
    try {
      setLoading(true)
      setError(null)

      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

      const data = await masterDashboardApi.getCalendar(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      )

      setCalendarData(data)
    } catch (err) {
      console.error('Error loading calendar:', err)
      setError('Не удалось загрузить календарь')
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i))
    }
    return days
  }

  const getBookingsForDay = (day: Date): CalendarBooking[] => {
    if (!calendarData) return []
    return calendarData.bookings.filter(booking =>
      isSameDay(parseISO(booking.start_at), day)
    )
  }

  const getScheduleForDay = (day: Date) => {
    if (!calendarData) return null
    const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1 // Convert to 0=Monday
    return calendarData.schedules.find(s => s.day_of_week === dayOfWeek)
  }

  const isDayOff = (day: Date): boolean => {
    if (!calendarData) return false
    const dayStr = format(day, 'yyyy-MM-dd')
    return calendarData.day_offs.some(d => d.date === dayStr)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      confirmed: 'bg-green-100 border-green-300 text-green-800',
      completed: 'bg-gray-100 border-gray-300 text-gray-800',
      cancelled_by_client: 'bg-red-100 border-red-300 text-red-800',
      cancelled_by_salon: 'bg-red-100 border-red-300 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-blue-100 border-blue-300 text-blue-800'
  }

  const weekDays = getWeekDays()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка календаря...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/master/dashboard" className="flex items-center text-primary-600 hover:text-primary-700">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Назад к дашборду
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Календарь записей</h1>
            <Link
              to="/master/schedule"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Настройки расписания
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Calendar Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Предыдущая неделя
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors font-medium"
              >
                Сегодня
              </button>
              <h2 className="text-xl font-bold text-gray-900">
                {format(weekDays[0], 'd MMM', { locale: ru })} - {format(weekDays[6], 'd MMM yyyy', { locale: ru })}
              </h2>
            </div>

            <button
              onClick={goToNextWeek}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Следующая неделя
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week View */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDays.map((day, index) => {
              const dayBookings = getBookingsForDay(day)
              const schedule = getScheduleForDay(day)
              const isOff = isDayOff(day)
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={index}
                  className={`bg-white min-h-[200px] ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                  {/* Day Header */}
                  <div className={`p-3 border-b ${isToday ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    <div className="text-sm font-semibold text-gray-700 capitalize">
                      {format(day, 'EEEE', { locale: ru })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                    {schedule && !isOff && (
                      <div className="text-xs text-gray-500 mt-1">
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    )}
                    {isOff && (
                      <div className="text-xs text-red-600 font-semibold mt-1">
                        Выходной
                      </div>
                    )}
                  </div>

                  {/* Bookings */}
                  <div className="p-2 space-y-2">
                    {isOff ? (
                      <p className="text-xs text-gray-500 text-center py-4">Нерабочий день</p>
                    ) : dayBookings.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Нет записей</p>
                    ) : (
                      dayBookings.map(booking => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={`w-full text-left p-2 rounded border-l-4 ${getStatusColor(booking.status)} hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-center text-xs font-semibold mb-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(parseISO(booking.start_at), 'HH:mm')}
                          </div>
                          <div className="text-xs font-medium truncate">
                            {booking.service_title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {booking.price} сум
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Статусы записей:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-300 mr-2"></div>
              <span className="text-sm text-gray-600">Ожидает</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-300 mr-2"></div>
              <span className="text-sm text-gray-600">Подтверждена</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-300 mr-2"></div>
              <span className="text-sm text-gray-600">Завершена</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border-l-4 border-red-300 mr-2"></div>
              <span className="text-sm text-gray-600">Отменена</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Детали записи</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Услуга</p>
                <p className="font-semibold text-gray-900">{selectedBooking.service_title}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Время</p>
                <p className="font-semibold text-gray-900">
                  {format(parseISO(selectedBooking.start_at), 'd MMMM yyyy, HH:mm', { locale: ru })} -
                  {format(parseISO(selectedBooking.end_at), 'HH:mm')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Стоимость</p>
                <p className="font-semibold text-gray-900">{selectedBooking.price.toLocaleString()} сум</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Статус</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>

              {selectedBooking.client_notes && (
                <div>
                  <p className="text-sm text-gray-600">Примечания клиента</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedBooking.client_notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link
                to="/master/bookings"
                className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                onClick={() => setSelectedBooking(null)}
              >
                Перейти ко всем записям
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
