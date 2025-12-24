import { useState, useEffect } from 'react'
import { X, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { mastersApi } from '../api/masters'
import { Master } from '../api/types'
import { serviceMastersApi } from '../api/serviceMasters'

interface ServiceMastersModalProps {
  serviceId: number
  serviceName: string
  salonId: number
  onClose: () => void
}

export default function ServiceMastersModal({
  serviceId,
  serviceName,
  salonId,
  onClose
}: ServiceMastersModalProps) {
  const [masters, setMasters] = useState<Master[]>([])
  const [selectedMasterIds, setSelectedMasterIds] = useState<number[]>([])
  const [initialMasterIds, setInitialMasterIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [serviceId, salonId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Загружаем всех мастеров салона
      const allMasters = await mastersApi.getMasters({ salon_id: salonId })
      setMasters(allMasters)

      // Загружаем уже назначенных мастеров для этой услуги
      const assignedMasterIds = await serviceMastersApi.getMastersByService(serviceId)
      setSelectedMasterIds(assignedMasterIds)
      setInitialMasterIds(assignedMasterIds)
    } catch (err: any) {
      console.error('Error loading masters:', err)
      setError('Не удалось загрузить список мастеров')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMaster = (masterId: number) => {
    setSelectedMasterIds(prev => {
      if (prev.includes(masterId)) {
        return prev.filter(id => id !== masterId)
      } else {
        return [...prev, masterId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedMasterIds.length === masters.length) {
      setSelectedMasterIds([])
    } else {
      setSelectedMasterIds(masters.map(m => m.id))
    }
  }

  const hasChanges = () => {
    if (selectedMasterIds.length !== initialMasterIds.length) return true
    const sortedSelected = [...selectedMasterIds].sort()
    const sortedInitial = [...initialMasterIds].sort()
    return !sortedSelected.every((id, index) => id === sortedInitial[index])
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await serviceMastersApi.updateServiceMasters(serviceId, selectedMasterIds)
      setSuccess(true)
      setInitialMasterIds(selectedMasterIds)

      // Закрыть модалку через 1 секунду после успеха
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      console.error('Error updating service masters:', err)
      setError(err.response?.data?.detail || 'Не удалось обновить список мастеров')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center">
            <div className="text-xl">Загрузка...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-primary-600" />
              Мастера для услуги
            </h2>
            <p className="text-sm text-gray-600 mt-1">{serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-green-800">Список мастеров успешно обновлен</p>
            </div>
          )}

          {masters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет мастеров</h3>
              <p className="text-gray-600">
                Сначала добавьте мастеров в ваш салон, чтобы назначить их на услуги
              </p>
            </div>
          ) : (
            <>
              {/* Select All Button */}
              <div className="mb-4 pb-4 border-b">
                <button
                  onClick={handleSelectAll}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  disabled={saving}
                >
                  {selectedMasterIds.length === masters.length
                    ? 'Снять выбор со всех'
                    : 'Выбрать всех'}
                </button>
                <span className="text-sm text-gray-500 ml-4">
                  Выбрано: {selectedMasterIds.length} из {masters.length}
                </span>
              </div>

              {/* Masters List */}
              <div className="space-y-3">
                {masters.map(master => (
                  <label
                    key={master.id}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMasterIds.includes(master.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMasterIds.includes(master.id)}
                      onChange={() => handleToggleMaster(master.id)}
                      className="mt-1 h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={saving}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{master.name}</span>
                        {master.is_active ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            Активен
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            Неактивен
                          </span>
                        )}
                      </div>
                      {master.specialization && (
                        <p className="text-sm text-gray-600 mt-1">{master.specialization}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span>Опыт: {master.experience_years} лет</span>
                        {master.rating > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Рейтинг: {master.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !hasChanges() || masters.length === 0}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
