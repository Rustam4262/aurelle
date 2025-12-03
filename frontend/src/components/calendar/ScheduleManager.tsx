import { useEffect, useState } from 'react'
import { scheduleApi, MasterSchedule, MasterScheduleCreate, MasterDayOff } from '../../api/schedule'

interface ScheduleManagerProps {
  masterId: number
  readOnly?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Понедельник' },
  { value: 1, label: 'Вторник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Четверг' },
  { value: 4, label: 'Пятница' },
  { value: 5, label: 'Суббота' },
  { value: 6, label: 'Воскресенье' }
] as const

export default function ScheduleManager({ masterId, readOnly = false }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<MasterSchedule[]>([])
  const [dayOffs, setDayOffs] = useState<MasterDayOff[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDayOffForm, setShowDayOffForm] = useState(false)

  const [newSchedule, setNewSchedule] = useState<MasterScheduleCreate>({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    is_active: true
  })

  const [newDayOff, setNewDayOff] = useState({
    date: '',
    reason: ''
  })

  useEffect(() => {
    loadSchedules()
    loadDayOffs()
  }, [masterId])

  const loadSchedules = async () => {
    try {
      const data = await scheduleApi.getSchedules(masterId)
      setSchedules(data)
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error)
    }
  }

  const loadDayOffs = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const data = await scheduleApi.getDayOffs(masterId, today)
      setDayOffs(data)
    } catch (error) {
      console.error('Ошибка загрузки выходных:', error)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await scheduleApi.createSchedule(masterId, newSchedule)
      await loadSchedules()
      setShowAddForm(false)
      setNewSchedule({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00',
        is_active: true
      })
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка создания расписания')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Удалить это расписание?')) return
    try {
      await scheduleApi.deleteSchedule(scheduleId)
      await loadSchedules()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления расписания')
    }
  }

  const handleCreateDayOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDayOff.date) {
      alert('Выберите дату')
      return
    }
    setLoading(true)
    try {
      await scheduleApi.createDayOff(masterId, newDayOff)
      await loadDayOffs()
      setShowDayOffForm(false)
      setNewDayOff({ date: '', reason: '' })
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка добавления выходного дня')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDayOff = async (dayOffId: number) => {
    if (!confirm('Удалить этот выходной день?')) return
    try {
      await scheduleApi.deleteDayOff(dayOffId)
      await loadDayOffs()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления выходного дня')
    }
  }

  const getDayLabel = (dayOfWeek: number): string => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || ''
  }

  const getUsedDays = (): number[] => {
    return schedules.map(s => s.day_of_week)
  }

  const getAvailableDays = () => {
    const used = getUsedDays()
    return DAYS_OF_WEEK.filter(day => !used.includes(day.value))
  }

  return (
    <div className="space-y-6">
      {/* Расписание на неделю */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Расписание работы</h3>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              disabled={getAvailableDays().length === 0}
            >
              {showAddForm ? 'Отмена' : '+ Добавить день'}
            </button>
          )}
        </div>

        {/* Форма добавления */}
        {showAddForm && !readOnly && (
          <form onSubmit={handleCreateSchedule} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  День недели
                </label>
                <select
                  value={newSchedule.day_of_week}
                  onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: Number(e.target.value) as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {getAvailableDays().map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Начало
                  </label>
                  <input
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Конец
                  </label>
                  <input
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Перерыв с
                  </label>
                  <input
                    type="time"
                    value={newSchedule.break_start || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, break_start: e.target.value || undefined })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Перерыв до
                  </label>
                  <input
                    type="time"
                    value={newSchedule.break_end || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, break_end: e.target.value || undefined })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Список расписания */}
        <div className="space-y-2">
          {schedules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Расписание не настроено</p>
          ) : (
            schedules
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map(schedule => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{getDayLabel(schedule.day_of_week)}</div>
                    <div className="text-sm text-gray-600">
                      {schedule.start_time} - {schedule.end_time}
                      {schedule.break_start && schedule.break_end && (
                        <span className="ml-2 text-gray-500">
                          (перерыв: {schedule.break_start} - {schedule.break_end})
                        </span>
                      )}
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Выходные дни */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Выходные дни</h3>
          {!readOnly && (
            <button
              onClick={() => setShowDayOffForm(!showDayOffForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {showDayOffForm ? 'Отмена' : '+ Добавить выходной'}
            </button>
          )}
        </div>

        {/* Форма добавления выходного */}
        {showDayOffForm && !readOnly && (
          <form onSubmit={handleCreateDayOff} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={newDayOff.date}
                  onChange={(e) => setNewDayOff({ ...newDayOff, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина (необязательно)
                </label>
                <input
                  type="text"
                  value={newDayOff.reason}
                  onChange={(e) => setNewDayOff({ ...newDayOff, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Отпуск, больничный..."
                />
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {loading ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Список выходных */}
        <div className="space-y-2">
          {dayOffs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Выходные дни не добавлены</p>
          ) : (
            dayOffs.map(dayOff => (
              <div
                key={dayOff.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(dayOff.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  {dayOff.reason && (
                    <div className="text-sm text-gray-600">{dayOff.reason}</div>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDeleteDayOff(dayOff.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
