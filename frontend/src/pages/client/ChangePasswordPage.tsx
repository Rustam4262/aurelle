import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { ArrowLeft, Lock, Check } from 'lucide-react'
import ErrorAlert from '../../components/ErrorAlert'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Валидация
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Пожалуйста, заполните все поля')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Новый пароль должен отличаться от текущего')
      return
    }

    setLoading(true)

    try {
      await authApi.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      })

      setSuccess(true)
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      // Перенаправление через 2 секунды
      setTimeout(() => {
        navigate('/client/profile')
      }, 2000)
    } catch (error: any) {
      console.error('Error changing password:', error)
      setError(error.response?.data?.detail || 'Не удалось изменить пароль. Проверьте правильность текущего пароля.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/client/profile" className="flex items-center text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад к профилю
          </Link>
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center mb-6">
            <Lock className="w-8 h-8 text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Смена пароля</h1>
          </div>

          {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-3" />
                <p className="text-green-800 font-medium">
                  Пароль успешно изменен! Перенаправление...
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текущий пароль
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите текущий пароль"
                disabled={loading || success}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый пароль
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите новый пароль (минимум 6 символов)"
                disabled={loading || success}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подтверждение нового пароля
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Повторите новый пароль"
                disabled={loading || success}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Требования к паролю:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li>Минимум 6 символов</li>
                <li>Должен отличаться от текущего пароля</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Изменение...' : 'Изменить пароль'}
              </button>
              <Link
                to="/client/profile"
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
