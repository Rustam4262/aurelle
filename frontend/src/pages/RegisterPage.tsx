import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { formatPhoneInput, getPhoneError, getEmailError } from '../utils/validation'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()

  const isSalonOwner = searchParams.get('type') === 'salon'

  const [formData, setFormData] = useState({
    phone: '+998',
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: (isSalonOwner ? 'salon_owner' : 'client') as 'client' | 'salon_owner' | 'admin',
  })

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{phone?: string, email?: string}>({})
  const [loading, setLoading] = useState(false)

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value)
    setFormData({ ...formData, phone: formatted })

    // Очистить ошибку при изменении
    if (fieldErrors.phone) {
      setFieldErrors({ ...fieldErrors, phone: undefined })
    }
  }

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value })

    // Очистить ошибку при изменении
    if (fieldErrors.email) {
      setFieldErrors({ ...fieldErrors, email: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Валидация телефона
    const phoneError = getPhoneError(formData.phone)
    if (phoneError) {
      setFieldErrors({ phone: phoneError })
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }

    // Валидация email (если заполнен)
    const emailError = getEmailError(formData.email)
    if (emailError) {
      setFieldErrors({ email: emailError })
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)

    try {
      const response = await authApi.register({
        phone: formData.phone,
        email: formData.email || undefined,
        name: formData.name,
        password: formData.password,
        role: formData.role,
      })

      setAuth(response.user, response.access_token)

      if (response.user.role === 'salon_owner') {
        navigate('/salon/dashboard')
      } else if (response.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/client/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {isSalonOwner ? 'Регистрация салона' : 'Регистрация'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Имя {isSalonOwner && '(или название салона)'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Номер телефона
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+998901234567"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Формат: +998XXXXXXXXX (9 цифр после +998)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (опционально)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="example@mail.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {!isSalonOwner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Роль
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'client' | 'salon_owner' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="client">Клиент</option>
                <option value="salon_owner">Владелец салона</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
