import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { salonsApi } from '../../api/salons'
import LocationPicker from '../../components/map/LocationPicker'
import { MapPin, Building, Phone, FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface FormData {
  name: string
  description: string
  address: string
  phone: string
  latitude: number | null
  longitude: number | null
}

interface FormErrors {
  name?: string
  address?: string
  phone?: string
  coordinates?: string
}

export default function CreateSalonPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Основная информация, 2: Местоположение, 3: Завершение
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    phone: '',
    latitude: null,
    longitude: null
  })

  // Ташкент по умолчанию
  const defaultCenter: [number, number] = [41.311151, 69.279737]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Очистить ошибку при изменении
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleLocationSelect = (lat: number, lon: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }))
    setErrors(prev => ({ ...prev, coordinates: undefined }))
  }

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Название должно быть не менее 3 символов'
    }

    if (!formData.address || formData.address.length < 10) {
      newErrors.address = 'Введите полный адрес (минимум 10 символов)'
    }

    if (!formData.phone || !/^\+?[\d\s()-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    if (!formData.latitude || !formData.longitude) {
      setErrors({ coordinates: 'Выберите местоположение на карте' })
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handlePrevStep = () => {
    setStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      return
    }

    setLoading(true)
    try {
      const salon = await salonsApi.createSalon({
        name: formData.name,
        description: formData.description || undefined,
        address: formData.address,
        phone: formData.phone,
        latitude: formData.latitude!,
        longitude: formData.longitude!
      })

      // Успешно создан - переход к дашборду
      setTimeout(() => {
        navigate('/salon/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error creating salon:', error)
      setErrors({
        name: error.response?.data?.detail || 'Ошибка при создании салона. Попробуйте снова.'
      })
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Создание салона красоты</h1>
          <p className="text-lg text-gray-600">Всего несколько шагов до старта</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= num
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                {num < 3 && (
                  <div className={`w-24 h-1 mx-2 ${
                    step > num ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-3 text-sm font-medium text-gray-600">
            <span className="w-32 text-center">Информация</span>
            <span className="w-32 text-center">Местоположение</span>
            <span className="w-32 text-center">Готово</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building className="w-12 h-12 text-primary-600 mx-auto mb-3" />
                <h2 className="text-2xl font-semibold mb-2">Основная информация</h2>
                <p className="text-gray-600">Расскажите о вашем салоне</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название салона <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Например: Салон красоты 'Элегантность'"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (необязательно)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Кратко опишите ваш салон, услуги и преимущества..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="г. Москва, ул. Тверская, д. 1"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.address}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+7 (999) 123-45-67"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleNextStep}
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <MapPin className="w-12 h-12 text-primary-600 mx-auto mb-3" />
                <h2 className="text-2xl font-semibold mb-2">Местоположение</h2>
                <p className="text-gray-600">Укажите расположение салона на карте</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Подсказка:</strong> Кликните на карте, чтобы установить точное местоположение вашего салона
                </p>
              </div>

              <div className="border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <LocationPicker
                  initialCenter={defaultCenter}
                  initialZoom={formData.latitude && formData.longitude ? 15 : 11}
                  selectedLocation={
                    formData.latitude && formData.longitude
                      ? [formData.latitude, formData.longitude]
                      : null
                  }
                  onLocationSelect={handleLocationSelect}
                  style={{ height: '100%' }}
                />
              </div>

              {formData.latitude && formData.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Координаты: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {errors.coordinates && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.coordinates}
                </p>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={handlePrevStep}
                  className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-300 font-medium"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 font-medium"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                <h2 className="text-2xl font-semibold mb-2">Проверьте данные</h2>
                <p className="text-gray-600">Убедитесь, что всё верно перед созданием</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Название</p>
                  <p className="text-lg font-semibold text-gray-900">{formData.name}</p>
                </div>

                {formData.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Описание</p>
                    <p className="text-gray-900">{formData.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Адрес</p>
                  <p className="text-gray-900">{formData.address}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Телефон</p>
                  <p className="text-gray-900">{formData.phone}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Координаты</p>
                  <p className="text-gray-900">
                    {formData.latitude?.toFixed(6)}, {formData.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Создание салона...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      После создания салона вы сможете добавить услуги, мастеров и начать принимать записи
                    </p>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={handlePrevStep}
                      className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-300 font-medium"
                      disabled={loading}
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium flex items-center"
                      disabled={loading}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Создать салон
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
