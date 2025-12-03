import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import { Salon } from '../../api/types'
import { ArrowLeft, Save, Building } from 'lucide-react'
import ErrorAlert from '../../components/ErrorAlert'

export default function EditSalonPage() {
  const navigate = useNavigate()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: ''
  })

  useEffect(() => {
    loadSalon()
  }, [])

  const loadSalon = async () => {
    try {
      setLoading(true)
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const mySalon = salons[0]
        setSalon(mySalon)
        setFormData({
          name: mySalon.name,
          description: mySalon.description || '',
          address: mySalon.address,
          phone: mySalon.phone
        })
      } else {
        setError('У вас пока нет зарегистрированных салонов')
      }
    } catch (error) {
      console.error('Error loading salon:', error)
      setError('Не удалось загрузить информацию о салоне')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!salon) return

    // Валидация
    if (!formData.name || formData.name.length < 3) {
      setError('Название должно быть не менее 3 символов')
      return
    }

    if (!formData.address || formData.address.length < 10) {
      setError('Введите полный адрес (минимум 10 символов)')
      return
    }

    if (!formData.phone || !/^\+?[\d\s()-]{10,}$/.test(formData.phone)) {
      setError('Введите корректный номер телефона')
      return
    }

    setSaving(true)

    try {
      await salonsApi.updateSalon(salon.id, formData)
      setSuccess(true)

      setTimeout(() => {
        navigate('/salon/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error updating salon:', error)
      setError(error.response?.data?.detail || 'Не удалось обновить информацию о салоне')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">У вас пока нет зарегистрированных салонов</p>
          <Link
            to="/salon/create"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Создать салон
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/salon/dashboard"
            className="flex items-center text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад к панели
          </Link>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center mb-6">
            <Building className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Редактирование салона</h1>
              <p className="text-gray-600">Обновите информацию о вашем салоне</p>
            </div>
          </div>

          {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Информация успешно обновлена! Перенаправление...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название салона
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Например: Салон красоты 'Афродита'"
                disabled={saving || success}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Расскажите о вашем салоне..."
                disabled={saving || success}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Адрес
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Например: Москва, ул. Тверская, 10"
                disabled={saving || success}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+7 (999) 123-45-67"
                disabled={saving || success}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Примечание:</strong> Координаты салона на карте могут быть изменены только при создании салона.
                Если вам нужно изменить местоположение на карте, обратитесь к администратору.
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={saving || success}
                className="flex-1 flex items-center justify-center bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <Link
                to="/salon/dashboard"
                className="flex-1 text-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
