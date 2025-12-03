import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usersApi, UserUpdate } from '../../api/users'
import { User, LogOut, Save, ArrowLeft, Lock } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email || '',
        phone: user.phone
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const updateData: UserUpdate = {}

      if (formData.name !== user?.name) {
        updateData.name = formData.name
      }

      if (formData.email !== user?.email) {
        updateData.email = formData.email
      }

      if (formData.phone !== user?.phone) {
        updateData.phone = formData.phone
      }

      if (Object.keys(updateData).length === 0) {
        setError('Нет изменений для сохранения')
        setLoading(false)
        return
      }

      const updatedUser = await usersApi.updateMe(updateData)
      setUser(updatedUser)
      setSuccess('Профиль успешно обновлен!')

      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при обновлении профиля')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon</div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Привет, {user?.name}</span>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/client/dashboard"
            className="flex items-center text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад в личный кабинет
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="bg-primary-100 p-3 rounded-full mr-4">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Редактирование профиля</h1>
              <p className="text-gray-600">Обновите вашу личную информацию</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Имя
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Телефон
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (необязательно)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate('/client/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Безопасность</h3>
              <Link
                to="/client/change-password"
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Lock className="w-4 h-4 mr-2" />
                Изменить пароль
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Информация об аккаунте</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Роль:</dt>
                <dd className="text-gray-900 font-medium">
                  {user?.role === 'client' ? 'Клиент' :
                   user?.role === 'salon_owner' ? 'Владелец салона' :
                   user?.role === 'master' ? 'Мастер' : 'Администратор'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Дата регистрации:</dt>
                <dd className="text-gray-900 font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Статус:</dt>
                <dd className="text-gray-900 font-medium">
                  {user?.is_active ? 'Активен' : 'Неактивен'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
