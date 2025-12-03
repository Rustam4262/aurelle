import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { masterDashboardApi, MasterSchedule, MasterDayOff } from '../../api/masterDashboard'
import { ArrowLeft, Clock, Calendar, Plus, Trash2, Save, AlertCircle } from 'lucide-react'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Понедельник' },
  { value: 1, label: 'Вторник' },
  { value: 2, label: 'Среда' },
  { value: 3, label: 'Четверг' },
  { value: 4, label: 'Пятница' },
  { value: 5, label: 'Суббота' },
  { value: 6, label: 'Воскресенье' },
]

interface DayScheduleForm {
  start_time: string
  end_time: string
  break_start: string
  break_end: string
  is_active: boolean
}

export default function MasterScheduleSettings() {
  const [schedules, setSchedules] = useState<MasterSchedule[]>([])
  const [dayOffs, setDayOffs] = useState<MasterDayOff[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Day schedule forms
  const [dayForms, setDayForms] = useState<Record<number, DayScheduleForm>>({})

  // Day off form
  const [newDayOffDate, setNewDayOffDate] = useState('')
  const [newDayOffReason, setNewDayOffReason] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [schedulesData, dayOffsData] = await Promise.all([
        masterDashboardApi.getSchedule(),
        masterDashboardApi.getDayOffs()
      ])

      setSchedules(schedulesData)
      setDayOffs(dayOffsData)

      // Initialize forms
      const forms: Record<number, DayScheduleForm> = {}
      DAYS_OF_WEEK.forEach(day => {
        const existing = schedulesData.find(s => s.day_of_week === day.value)
        forms[day.value] = existing
          ? {
              start_time: existing.start_time,
              end_time: existing.end_time,
              break_start: existing.break_start || '',
              break_end: existing.break_end || '',
              is_active: existing.is_active
            }
          : {
              start_time: '09:00',
              end_time: '18:00',
              break_start: '',
              break_end: '',
              is_active: false
            }
      })
      setDayForms(forms)
    } catch (err) {
      console.error('Error loading schedule:', err)
      setError('Не удалось загрузить расписание')
    } finally {
      setLoading(false)
    }
  }

  const updateDayForm = (dayOfWeek: number, field: keyof DayScheduleForm, value: string | boolean) => {
    setDayForms(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }))
  }

  const saveScheduleForDay = async (dayOfWeek: number) => {
    try {
      setSaving(true)
      setError(null)

      const form = dayForms[dayOfWeek]
      const existing = schedules.find(s => s.day_of_week === dayOfWeek)

      const scheduleData = {
        day_of_week: dayOfWeek,
        start_time: form.start_time,
        end_time: form.end_time,
        break_start: form.break_start || undefined,
        break_end: form.break_end || undefined,
      }

      if (existing) {
        // Update
        await masterDashboardApi.updateSchedule(existing.id, {
          ...scheduleData,
          is_active: form.is_active
        })
      } else {
        // Create
        await masterDashboardApi.createSchedule(scheduleData)
      }

      setSuccess('Расписание сохранено')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      console.error('Error saving schedule:', err)
      setError(err.response?.data?.detail || 'Не удалось сохранить расписание')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = async (dayOfWeek: number) => {
    const form = dayForms[dayOfWeek]
    updateDayForm(dayOfWeek, 'is_active', !form.is_active)
  }

  const addDayOff = async () => {
    if (!newDayOffDate) {
      setError('Укажите дату выходного дня')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await masterDashboardApi.createDayOff({
        date: newDayOffDate,
        reason: newDayOffReason || undefined
      })

      setNewDayOffDate('')
      setNewDayOffReason('')
      setSuccess('Выходной день добавлен')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      console.error('Error adding day off:', err)
      setError(err.response?.data?.detail || 'Не удалось добавить выходной день')
    } finally {
      setSaving(false)
    }
  }

  const removeDayOff = async (id: number) => {
    if (!confirm('Удалить этот выходной день?')) return

    try {
      setSaving(true)
      setError(null)

      await masterDashboardApi.deleteDayOff(id)

      setSuccess('Выходной день удален')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err) {
      console.error('Error removing day off:', err)
      setError('Не удалось удалить выходной день')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/master/dashboard" className="flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад к дашборду
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Настройки расписания</h1>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Weekly Schedule */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-6">
            <Clock className="w-6 h-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Рабочее расписание</h2>
          </div>

          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => {
              const form = dayForms[day.value]
              if (!form) return null

              return (
                <div key={day.value} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={() => toggleDay(day.value)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label className="ml-3 text-lg font-semibold text-gray-900">
                        {day.label}
                      </label>
                    </div>
                    <button
                      onClick={() => saveScheduleForDay(day.value)}
                      disabled={saving || !form.is_active}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить
                    </button>
                  </div>

                  {form.is_active && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Начало работы
                        </label>
                        <input
                          type="time"
                          value={form.start_time}
                          onChange={(e) => updateDayForm(day.value, 'start_time', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Конец работы
                        </label>
                        <input
                          type="time"
                          value={form.end_time}
                          onChange={(e) => updateDayForm(day.value, 'end_time', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Начало перерыва (опционально)
                        </label>
                        <input
                          type="time"
                          value={form.break_start}
                          onChange={(e) => updateDayForm(day.value, 'break_start', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Конец перерыва (опционально)
                        </label>
                        <input
                          type="time"
                          value={form.break_end}
                          onChange={(e) => updateDayForm(day.value, 'break_end', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Offs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <Calendar className="w-6 h-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Выходные дни</h2>
          </div>

          {/* Add Day Off Form */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Добавить выходной день</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата
                </label>
                <input
                  type="date"
                  value={newDayOffDate}
                  onChange={(e) => setNewDayOffDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Причина (опционально)
                </label>
                <input
                  type="text"
                  value={newDayOffReason}
                  onChange={(e) => setNewDayOffReason(e.target.value)}
                  placeholder="Отпуск, больничный..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={addDayOff}
              disabled={saving || !newDayOffDate}
              className="mt-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </button>
          </div>

          {/* Day Offs List */}
          {dayOffs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Выходных дней не добавлено</p>
          ) : (
            <div className="space-y-2">
              {dayOffs.map(dayOff => (
                <div
                  key={dayOff.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{dayOff.date}</p>
                    {dayOff.reason && (
                      <p className="text-sm text-gray-600">{dayOff.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeDayOff(dayOff.id)}
                    disabled={saving}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
