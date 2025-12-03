import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, Package, Clock, DollarSign, X, AlertCircle, Users, Search, Filter } from 'lucide-react'
import { salonsApi } from '../../api/salons'
import { servicesApi } from '../../api/services'
import { serviceMastersApi } from '../../api/serviceMasters'
import { Service } from '../../api/types'
import ServiceMastersModal from '../../components/ServiceMastersModal'

interface ServiceFormData {
  title: string
  description: string
  price: string
  duration_minutes: string
  category: string
}

const CATEGORIES = [
  'Стрижка',
  'Окрашивание',
  'Укладка',
  'Маникюр',
  'Педикюр',
  'Косметология',
  'Массаж',
  'Эпиляция',
  'Другое'
]

export default function ManageServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    price: '',
    duration_minutes: '',
    category: ''
  })
  const [errors, setErrors] = useState<Partial<ServiceFormData>>({})
  const [showMastersModal, setShowMastersModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [serviceMastersCount, setServiceMastersCount] = useState<Record<number, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const salon = salons[0]
        setSalonId(salon.id)
        await loadServices(salon.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async (salonId: number) => {
    try {
      const data = await servicesApi.getServices({ salon_id: salonId })
      setServices(data)

      // Загрузить количество мастеров для каждой услуги
      const mastersCountMap: Record<number, number> = {}
      await Promise.all(
        data.map(async (service) => {
          try {
            const masterIds = await serviceMastersApi.getMastersByService(service.id)
            mastersCountMap[service.id] = masterIds.length
          } catch (error) {
            console.error(`Error loading masters count for service ${service.id}:`, error)
            mastersCountMap[service.id] = 0
          }
        })
      )
      setServiceMastersCount(mastersCountMap)
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        title: service.title,
        description: service.description || '',
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        category: service.category || ''
      })
    } else {
      setEditingService(null)
      setFormData({
        title: '',
        description: '',
        price: '',
        duration_minutes: '',
        category: ''
      })
    }
    setErrors({})
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({
      title: '',
      description: '',
      price: '',
      duration_minutes: '',
      category: ''
    })
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ServiceFormData> = {}

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = 'Название должно быть не менее 3 символов'
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Укажите корректную цену'
    }

    if (!formData.duration_minutes || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = 'Укажите длительность услуги'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !salonId) return

    setSubmitting(true)
    try {
      await servicesApi.createService({
        salon_id: salonId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        category: formData.category || undefined
      })

      await loadServices(salonId)
      handleCloseModal()
    } catch (error: any) {
      console.error('Error saving service:', error)
      setErrors({ title: error.response?.data?.detail || 'Ошибка при сохранении услуги' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (serviceId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return

    try {
      await servicesApi.deleteService(serviceId)
      if (salonId) {
        await loadServices(salonId)
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Ошибка при удалении услуги')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ServiceFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleOpenMastersModal = (service: Service) => {
    setSelectedService(service)
    setShowMastersModal(true)
  }

  const handleCloseMastersModal = async () => {
    setShowMastersModal(false)
    setSelectedService(null)

    // Перезагрузить услуги и количество мастеров после закрытия модала
    if (salonId) {
      await loadServices(salonId)
    }
  }

  // Фильтрация услуг
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (service.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [services, searchQuery, selectedCategory])

  // Группировка по категориям
  const groupedServices = useMemo(() => {
    const groups: Record<string, Service[]> = {}
    filteredServices.forEach(service => {
      const category = service.category || 'Без категории'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(service)
    })
    return groups
  }, [filteredServices])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!salonId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/salon/dashboard" className="flex items-center text-pink-600 hover:text-pink-700">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Назад
            </Link>
          </nav>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
            <p className="text-amber-800 font-medium">Сначала создайте салон</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/salon/dashboard" className="flex items-center text-pink-600 hover:text-pink-700 font-medium group">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Назад к дашборду
          </Link>
        </nav>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Управление услугами
            </h1>
            <p className="text-gray-600">Управляйте прайс-листом вашего салона</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:shadow-lg font-semibold transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить услугу
          </button>
        </div>

        {services.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Нет услуг</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Добавьте первую услугу, чтобы клиенты могли записываться к вам
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-xl hover:shadow-lg font-semibold"
            >
              Добавить услугу
            </button>
          </div>
        ) : (
          <>
            {/* Search and Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск услуг..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:w-64 relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Все категории</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Всего услуг: <span className="font-semibold text-gray-900">{services.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Найдено: <span className="font-semibold text-gray-900">{filteredServices.length}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Services Grid */}
            {filteredServices.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <div key={service.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden group">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                            {service.title}
                          </h3>
                          {service.category && (
                            <span className="inline-block px-3 py-1 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 text-xs font-semibold rounded-lg border border-pink-200">
                              {service.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {service.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mr-3">
                            <DollarSign className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{service.price.toLocaleString()} сум</div>
                            <div className="text-xs text-gray-500">Стоимость</div>
                          </div>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mr-3">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{service.duration_minutes} мин</div>
                            <div className="text-xs text-gray-500">Длительность</div>
                          </div>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <Users className="w-4 h-4 text-pink-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{serviceMastersCount[service.id] || 0}</div>
                            <div className="text-xs text-gray-500">
                              {serviceMastersCount[service.id] === 1 ? 'Мастер' : 'Мастеров'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleOpenMastersModal(service)}
                          className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600 rounded-xl hover:from-pink-100 hover:to-purple-100 font-semibold transition-all border border-pink-200"
                        >
                          <Users className="w-4 h-4 mr-1.5" />
                          Мастера
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="flex-1 flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold transition-all border border-red-200"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for Add/Edit Service */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingService ? 'Редактировать услугу' : 'Новая услуга'}
                </h2>
                <p className="text-pink-100 text-sm mt-1">
                  {editingService ? 'Обновите информацию об услуге' : 'Добавьте новую услугу в прайс-лист'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Название услуги <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                    errors.title ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="Например: Женская стрижка"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Категория
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 hover:border-gray-300 transition-all"
                >
                  <option value="">Выберите категорию</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 hover:border-gray-300 transition-all resize-none"
                  placeholder="Краткое описание услуги..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цена (сум) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="1000"
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                        errors.price ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="50000"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {errors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Длительность (мин) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                    <input
                      type="number"
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleInputChange}
                      min="0"
                      step="5"
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                        errors.duration_minutes ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="60"
                    />
                  </div>
                  {errors.duration_minutes && (
                    <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {errors.duration_minutes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all"
                  disabled={submitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg font-semibold disabled:opacity-50 transition-all transform hover:scale-105 disabled:hover:scale-100"
                  disabled={submitting}
                >
                  {submitting ? 'Сохранение...' : editingService ? '✓ Сохранить' : '+ Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Managing Service Masters */}
      {showMastersModal && selectedService && salonId && (
        <ServiceMastersModal
          serviceId={selectedService.id}
          serviceName={selectedService.title}
          salonId={salonId}
          onClose={handleCloseMastersModal}
        />
      )}
    </div>
  )
}
