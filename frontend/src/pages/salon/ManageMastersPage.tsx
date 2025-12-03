import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, Users, Star, Phone, Briefcase, X, AlertCircle, Award, Search, Filter, Camera, Upload } from 'lucide-react'
import { salonsApi } from '../../api/salons'
import { mastersApi, Master } from '../../api/masters'
import { uploadsApi } from '../../api/uploads'
import ImageUpload from '../../components/ImageUpload'

interface MasterFormData {
  name: string
  phone: string
  description: string
  specialization: string
  experience_years: string
}

const SPECIALIZATIONS = [
  'Парикмахер',
  'Колорист',
  'Стилист',
  'Мастер маникюра',
  'Мастер педикюра',
  'Косметолог',
  'Массажист',
  'Визажист',
  'Бровист',
  'Универсал'
]

export default function ManageMastersPage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMaster, setEditingMaster] = useState<Master | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<MasterFormData>({
    name: '',
    phone: '',
    description: '',
    specialization: '',
    experience_years: ''
  })
  const [errors, setErrors] = useState<Partial<MasterFormData>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all')
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const salon = salons[0]
        setSalonId(salon.id)
        await loadMasters(salon.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMasters = async (salonId: number) => {
    try {
      const data = await mastersApi.getMasters({ salon_id: salonId })
      setMasters(data)
    } catch (error) {
      console.error('Error loading masters:', error)
    }
  }

  const handleOpenModal = (master?: Master) => {
    if (master) {
      setEditingMaster(master)
      setFormData({
        name: master.name,
        phone: master.phone || '',
        description: master.description || '',
        specialization: master.specialization || '',
        experience_years: master.experience_years.toString()
      })
    } else {
      setEditingMaster(null)
      setFormData({
        name: '',
        phone: '',
        description: '',
        specialization: '',
        experience_years: ''
      })
    }
    setErrors({})
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMaster(null)
    setFormData({
      name: '',
      phone: '',
      description: '',
      specialization: '',
      experience_years: ''
    })
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<MasterFormData> = {}

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Имя должно быть не менее 2 символов'
    }

    if (formData.phone && !/^\+?[\d\s()-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона'
    }

    if (!formData.experience_years || parseInt(formData.experience_years) < 0) {
      newErrors.experience_years = 'Укажите опыт работы'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !salonId) return

    setSubmitting(true)
    try {
      if (editingMaster) {
        await mastersApi.updateMaster(editingMaster.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          description: formData.description.trim() || undefined,
          specialization: formData.specialization || undefined,
          experience_years: parseInt(formData.experience_years)
        })
      } else {
        await mastersApi.createMaster({
          salon_id: salonId,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          description: formData.description.trim() || undefined,
          specialization: formData.specialization || undefined,
          experience_years: parseInt(formData.experience_years)
        })
      }

      await loadMasters(salonId)
      handleCloseModal()
    } catch (error: any) {
      console.error('Error saving master:', error)
      setErrors({ name: error.response?.data?.detail || 'Ошибка при сохранении мастера' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (masterId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого мастера?')) return

    try {
      await mastersApi.deleteMaster(masterId)
      if (salonId) {
        await loadMasters(salonId)
      }
    } catch (error) {
      console.error('Error deleting master:', error)
      alert('Ошибка при удалении мастера')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof MasterFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleUploadAvatar = async (masterId: number, file: File) => {
    setUploadingAvatar(true)
    try {
      await uploadsApi.uploadMasterAvatar(masterId, file)
      if (salonId) {
        await loadMasters(salonId)
      }
      alert('Аватар успешно загружен!')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Ошибка при загрузке аватара')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Фильтрация мастеров
  const filteredMasters = useMemo(() => {
    return masters.filter(master => {
      const matchesSearch = master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (master.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                           (master.specialization?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      const matchesSpecialization = selectedSpecialization === 'all' || master.specialization === selectedSpecialization
      return matchesSearch && matchesSpecialization
    })
  }, [masters, searchQuery, selectedSpecialization])

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
              Управление мастерами
            </h1>
            <p className="text-gray-600">Управляйте командой вашего салона</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:shadow-lg font-semibold transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить мастера
          </button>
        </div>

        {masters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Нет мастеров</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Добавьте первого мастера в свою команду
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-xl hover:shadow-lg font-semibold"
            >
              Добавить мастера
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
                    placeholder="Поиск по имени, специализации..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:w-64 relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedSpecialization}
                    onChange={(e) => setSelectedSpecialization(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Все специализации</option>
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Всего мастеров: <span className="font-semibold text-gray-900">{masters.length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Найдено: <span className="font-semibold text-gray-900">{filteredMasters.length}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Masters Grid */}
            {filteredMasters.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMasters.map((master) => (
              <div key={master.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden group">
                <div className="p-6">
                  {/* Avatar with upload button */}
                  <div className="flex items-start mb-4">
                    <div className="relative group/avatar">
                      {master.avatar_url ? (
                        <img
                          src={master.avatar_url}
                          alt={master.name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-pink-200"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-2 border-pink-200">
                          {master.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label
                        className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadAvatar(master.id, file)
                          }}
                        />
                      </label>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                        {master.name}
                      </h3>
                      {master.specialization && (
                        <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200">
                          {master.specialization}
                        </span>
                      )}
                    </div>
                  </div>

                  {master.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{master.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {master.phone && (
                      <div className="flex items-center text-sm">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mr-3">
                          <Phone className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">{master.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mr-3">
                        <Award className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{master.experience_years} {master.experience_years === 1 ? 'год' : master.experience_years < 5 ? 'года' : 'лет'}</div>
                        <div className="text-xs text-gray-500">Опыт работы</div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg flex items-center justify-center mr-3">
                        <Star className="w-4 h-4 text-yellow-600 fill-current" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{master.rating.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">{master.reviews_count} отзывов</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenModal(master)}
                      className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600 rounded-xl hover:from-pink-100 hover:to-purple-100 font-semibold transition-all border border-pink-200"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(master.id)}
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

      {/* Modal for Add/Edit Master */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingMaster ? 'Редактировать мастера' : 'Новый мастер'}
                </h2>
                <p className="text-pink-100 text-sm mt-1">
                  {editingMaster ? 'Обновите информацию о мастере' : 'Добавьте нового мастера в команду'}
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
                  ФИО мастера <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-600" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                      errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="Например: Иванова Мария Петровна"
                  />
                </div>
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Специализация
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 hover:border-gray-300 transition-all"
                >
                  <option value="">Выберите специализацию</option>
                  {SPECIALIZATIONS.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Телефон
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                        errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="+998 90 123 45 67"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Опыт работы (лет) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                    <input
                      type="number"
                      name="experience_years"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                        errors.experience_years ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="5"
                    />
                  </div>
                  {errors.experience_years && (
                    <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {errors.experience_years}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 hover:border-gray-300 transition-all resize-none"
                  placeholder="Краткая информация о мастере, его достижениях и навыках..."
                />
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
                  {submitting ? 'Сохранение...' : editingMaster ? '✓ Сохранить' : '+ Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
