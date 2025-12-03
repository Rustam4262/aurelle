import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Save, AlertCircle, CheckCircle, Users } from 'lucide-react'
import { salonsApi } from '../../api/salons'
import { mastersApi, Master } from '../../api/masters'

interface DaySchedule {
  isWorking: boolean
  startTime: string
  endTime: string
}

interface WeekSchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

const DAYS_OF_WEEK = [
  { key: 'monday' as const, label: 'Понедельник', short: 'Пн' },
  { key: 'tuesday' as const, label: 'Вторник', short: 'Вт' },
  { key: 'wednesday' as const, label: 'Среда', short: 'Ср' },
  { key: 'thursday' as const, label: 'Четверг', short: 'Чт' },
  { key: 'friday' as const, label: 'Пятница', short: 'Пт' },
  { key: 'saturday' as const, label: 'Суббота', short: 'Сб' },
  { key: 'sunday' as const, label: 'Воскресенье', short: 'Вс' },
]

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  isWorking: false,
  startTime: '09:00',
  endTime: '18:00',
}

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
  tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
  wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
  thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
  friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
  saturday: { isWorking: true, startTime: '10:00', endTime: '16:00' },
  sunday: { isWorking: false, startTime: '10:00', endTime: '16:00' },
}

export default function ManageSchedulePage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salonId, setSalonId] = useState<number | null>(null)
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const salon = salons[0]
        setSalonId(salon.id)

        const mastersData = await mastersApi.getMasters({ salon_id: salon.id })
        setMasters(mastersData)

        if (mastersData.length > 0) {
          setSelectedMaster(mastersData[0])
          loadMasterSchedule(mastersData[0])
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Не удалось загрузить данные. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  const loadMasterSchedule = (master: Master) => {
    try {
      // Пытаемся извлечь расписание из description
      if (master.description) {
        const scheduleMatch = master.description.match(/SCHEDULE:(.+?)(?:$|\n)/)
        if (scheduleMatch) {
          const parsedSchedule = JSON.parse(scheduleMatch[1])
          setSchedule(parsedSchedule)
          return
        }
      }
    } catch (e) {
      console.error('Error parsing schedule:', e)
    }

    // Если не удалось загрузить, используем дефолтное расписание
    setSchedule(DEFAULT_WEEK_SCHEDULE)
  }

  const handleMasterChange = (masterId: number) => {
    const master = masters.find(m => m.id === masterId)
    if (master) {
      setSelectedMaster(master)
      loadMasterSchedule(master)
      setSaveSuccess(false)
    }
  }

  const handleDayToggle = (day: keyof WeekSchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isWorking: !prev[day].isWorking
      }
    }))
    setSaveSuccess(false)
  }

  const handleTimeChange = (day: keyof WeekSchedule, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
    setSaveSuccess(false)
  }

  const applyToAllDays = () => {
    const template = schedule.monday
    const newSchedule = {} as WeekSchedule

    DAYS_OF_WEEK.forEach(day => {
      newSchedule[day.key] = { ...template }
    })

    setSchedule(newSchedule)
    setSaveSuccess(false)
  }

  const applyToWeekdays = () => {
    const template = schedule.monday
    setSchedule(prev => ({
      ...prev,
      monday: { ...template },
      tuesday: { ...template },
      wednesday: { ...template },
      thursday: { ...template },
      friday: { ...template },
    }))
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!selectedMaster) return

    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      // Сохраняем расписание в description мастера
      const scheduleJSON = JSON.stringify(schedule)
      let newDescription = selectedMaster.description || ''

      // Удаляем старое расписание, если есть
      newDescription = newDescription.replace(/SCHEDULE:.+?(?:$|\n)/, '')

      // Добавляем новое расписание
      newDescription += `\nSCHEDULE:${scheduleJSON}`

      await mastersApi.updateMaster(selectedMaster.id, {
        description: newDescription.trim()
      })

      // Обновляем локальное состояние
      const updatedMasters = masters.map(m =>
        m.id === selectedMaster.id
          ? { ...m, description: newDescription.trim() }
          : m
      )
      setMasters(updatedMasters)
      setSelectedMaster({ ...selectedMaster, description: newDescription.trim() })

      setSaveSuccess(true)

      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (err: any) {
      console.error('Error saving schedule:', err)
      setError(err.response?.data?.detail || 'Ошибка при сохранении расписания')
    } finally {
      setSaving(false)
    }
  }

  const getWorkingHoursCount = () => {
    return DAYS_OF_WEEK.filter(day => schedule[day.key].isWorking).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Назад к дашборду
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 font-medium">Загрузка расписания...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !selectedMaster) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Назад к дашборду
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Ошибка загрузки</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (masters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Назад к дашборду
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-12 text-center border border-pink-100">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Нет мастеров</h3>
            <p className="text-gray-600 mb-8 text-lg">Сначала добавьте мастеров в вашу команду</p>
            <Link
              to="/salon/masters"
              className="inline-flex items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3.5 rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 font-semibold shadow-lg"
            >
              <Users className="w-5 h-5 mr-2" />
              Управление мастерами
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/salon/dashboard" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Назад к дашборду
          </Link>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl mb-4 shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Расписание мастеров
          </h1>
          <p className="text-gray-600 text-lg">Настройте рабочие часы для каждого мастера</p>
        </div>

        {/* Master Selector */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 mb-6 border border-pink-100">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-white" />
            </div>
            <label className="text-base font-semibold text-gray-900">
              Выберите мастера
            </label>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <select
              value={selectedMaster?.id || ''}
              onChange={(e) => handleMasterChange(parseInt(e.target.value))}
              className="flex-1 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base bg-white"
            >
              {masters.map(master => (
                <option key={master.id} value={master.id}>
                  {master.name} {master.specialization ? `- ${master.specialization}` : ''}
                </option>
              ))}
            </select>
            {selectedMaster && (
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                <Calendar className="w-4 h-4 text-pink-600 mr-2" />
                <span className="text-sm font-semibold text-gray-900">
                  {getWorkingHoursCount()} / 7 рабочих дней
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold text-gray-900">Быстрые действия</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={applyToWeekdays}
                className="px-5 py-2.5 bg-white text-purple-700 rounded-xl hover:bg-purple-100 transition-all transform hover:scale-105 text-sm font-semibold border border-purple-200 shadow-sm"
              >
                Применить к будням (Пн-Пт)
              </button>
              <button
                onClick={applyToAllDays}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 text-sm font-semibold shadow-sm"
              >
                Применить ко всем дням
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden mb-6 border border-pink-100">
          <div className="divide-y divide-pink-100">
            {DAYS_OF_WEEK.map((day, index) => (
              <div
                key={day.key}
                className={`p-6 transition-all ${
                  schedule[day.key].isWorking
                    ? 'hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Day Toggle */}
                  <div className="flex items-center space-x-4 min-w-[200px]">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      schedule[day.key].isWorking
                        ? 'bg-gradient-to-br from-pink-400 to-purple-400 text-white shadow-md'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {day.short}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule[day.key].isWorking}
                        onChange={() => handleDayToggle(day.key)}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-500 shadow-inner"></div>
                    </label>
                    <div>
                      <div className="font-bold text-gray-900 text-base">{day.label}</div>
                      <div className={`text-xs font-medium ${
                        schedule[day.key].isWorking ? 'text-pink-600' : 'text-gray-500'
                      }`}>
                        {schedule[day.key].isWorking ? 'Рабочий день' : 'Выходной'}
                      </div>
                    </div>
                  </div>

                  {/* Time Inputs */}
                  {schedule[day.key].isWorking && (
                    <div className="flex items-center space-x-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Начало</label>
                        <input
                          type="time"
                          value={schedule[day.key].startTime}
                          onChange={(e) => handleTimeChange(day.key, 'startTime', e.target.value)}
                          className="px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white font-medium"
                        />
                      </div>
                      <div className="text-pink-300 mt-6 font-bold text-lg">→</div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Конец</label>
                        <input
                          type="time"
                          value={schedule[day.key].endTime}
                          onChange={(e) => handleTimeChange(day.key, 'endTime', e.target.value)}
                          className="px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100 mb-6">
          <div className="flex-1">
            {error && (
              <div className="flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm font-semibold">Расписание успешно сохранено!</span>
              </div>
            )}
            {!error && !saveSuccess && (
              <div className="text-sm text-gray-500">
                Нажмите кнопку для сохранения изменений расписания
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3.5 rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Сохранить расписание
              </>
            )}
          </button>
        </div>

        {/* Info Block */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 shadow-md">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-gray-900 mb-2 text-base">О расписании</p>
              <p className="text-gray-700 leading-relaxed">
                Это базовое недельное расписание мастера. Клиенты смогут записываться только в рабочие часы.
                В будущем можно будет настраивать индивидуальное расписание на конкретные даты и отмечать отпуска.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
