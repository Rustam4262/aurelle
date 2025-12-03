import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react'
import { salonsApi } from '../../api/salons'
import { uploadsApi } from '../../api/uploads'
import { Salon } from '../../api/types'
import ImageUpload from '../../components/ImageUpload'

export default function ManageSalonPhotosPage() {
  const navigate = useNavigate()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSalon()
  }, [])

  const loadSalon = async () => {
    try {
      setLoading(true)
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        setSalon(salons[0])
      }
    } catch (error) {
      console.error('Error loading salon:', error)
      alert('Не удалось загрузить информацию о салоне')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadLogo = async (file: File) => {
    if (!salon) return

    try {
      const response = await uploadsApi.uploadSalonLogo(salon.id, file)
      // Обновить салон в состоянии
      setSalon({ ...salon, logo_url: response.logo_url })
      alert('Логотип успешно загружен!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      throw error
    }
  }

  const handleUploadFacade = async (file: File) => {
    if (!salon) return

    try {
      const response = await uploadsApi.uploadSalonFacade(salon.id, file)
      // Обновить салон в состоянии
      setSalon({ ...salon, external_photo_url: response.external_photo_url } as Salon)
      alert('Фото фасада успешно загружено!')
    } catch (error) {
      console.error('Error uploading facade photo:', error)
      throw error
    }
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/salon/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к панели
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ImageIcon className="w-8 h-8 mr-3 text-primary-600" />
            Управление фото салона
          </h1>
          <p className="text-gray-600 mt-2">{salon.name}</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Требования к фотографиям</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Форматы: JPG, PNG, WebP</li>
            <li>• Максимальный размер: 5 МБ</li>
            <li>• Рекомендуемое разрешение: минимум 800x600 пикселей</li>
            <li>• Фото фасада обязательно для активации салона</li>
          </ul>
        </div>

        {/* Upload Forms */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* Logo Upload */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Логотип салона</h2>
            <p className="text-sm text-gray-600 mb-4">
              Загрузите логотип вашего салона. Он будет отображаться в списке салонов и на странице салона.
            </p>
            <ImageUpload
              label="Логотип"
              currentImage={salon.logo_url || undefined}
              onUpload={handleUploadLogo}
              helpText="PNG с прозрачным фоном рекомендуется"
            />
          </div>

          <div className="border-t border-gray-200 pt-8">
            {/* Facade Upload */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                Фото фасада
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                  Обязательно
                </span>
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Загрузите фото фасада вашего салона. Это поможет клиентам легко найти ваш салон.
                Фото фасада обязательно для активации салона на платформе.
              </p>
              <ImageUpload
                label="Фото фасада"
                currentImage={(salon as any).external_photo_url || undefined}
                onUpload={handleUploadFacade}
                helpText="Четкое фото входа в салон"
              />
            </div>
          </div>

          {/* Status */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Статус фотографий</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {salon.logo_url && (salon as any).external_photo_url ? (
                    <span className="text-green-600">✓ Все обязательные фото загружены</span>
                  ) : (
                    <span className="text-orange-600">
                      ! Требуется загрузить {!salon.logo_url && 'логотип'}
                      {!salon.logo_url && !(salon as any).external_photo_url && ' и '}
                      {!(salon as any).external_photo_url && 'фото фасада'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <Link
            to="/salon/dashboard"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center"
          >
            <Save className="w-5 h-5 mr-2" />
            Готово
          </Link>
        </div>
      </div>
    </div>
  )
}
