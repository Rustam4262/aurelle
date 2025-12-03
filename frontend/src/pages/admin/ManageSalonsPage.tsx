import { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { Salon } from '../../api/types'
import {
  Building2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  MapPin,
  Star,
  Phone,
  Power,
  Eye
} from 'lucide-react'

export default function ManageSalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null)

  useEffect(() => {
    loadSalons()
  }, [filterActive])

  const loadSalons = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 500 }

      if (filterActive === 'active') params.is_active = true
      if (filterActive === 'inactive') params.is_active = false
      if (searchQuery) params.search = searchQuery

      const data = await adminApi.getAllSalons(params)
      setSalons(data)
    } catch (error) {
      console.error('Failed to load salons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadSalons()
  }

  const handleToggleActive = async (salonId: number) => {
    if (!confirm('Вы уверены, что хотите изменить статус салона?')) return

    try {
      const result = await adminApi.toggleSalonActive(salonId)
      alert(result.message)
      loadSalons()
    } catch (error) {
      console.error('Failed to toggle salon:', error)
      alert('Ошибка при изменении статуса салона')
    }
  }

  const handleDelete = async (salon: Salon) => {
    if (!confirm(`Вы уверены, что хотите удалить салон "${salon.name}"? Это действие нельзя отменить!`)) return

    try {
      const result = await adminApi.deleteSalon(salon.id)
      alert(result.message)
      loadSalons()
    } catch (error) {
      console.error('Failed to delete salon:', error)
      alert('Ошибка при удалении салона')
    }
  }

  const filteredSalons = salons.filter(salon => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        salon.name.toLowerCase().includes(query) ||
        salon.address.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка салонов...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="w-8 h-8 mr-3 text-pink-500" />
          Управление салонами
        </h1>
        <p className="text-gray-600 mt-2">
          Модерация, активация и управление всеми салонами платформы
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по названию или адресу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">Все салоны</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
          </div>

          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Найти
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{salons.length}</p>
            <p className="text-sm text-gray-600">Всего салонов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {salons.filter(s => s.is_active).length}
            </p>
            <p className="text-sm text-gray-600">Активных</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {salons.filter(s => !s.is_active).length}
            </p>
            <p className="text-sm text-gray-600">Неактивных</p>
          </div>
        </div>
      </div>

      {/* Salons Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Салон</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Адрес</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Рейтинг</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Контакт</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Статус</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSalons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Салоны не найдены
                  </td>
                </tr>
              ) : (
                filteredSalons.map((salon) => (
                  <tr key={salon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">#{salon.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {salon.logo_url ? (
                          <img
                            src={salon.logo_url}
                            alt={salon.name}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{salon.name}</p>
                          <p className="text-xs text-gray-500">Владелец ID: {salon.owner_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{salon.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm font-semibold text-gray-900">
                          {salon.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({salon.reviews_count || 0})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-1" />
                        {salon.phone || 'Не указан'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {salon.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSalon(salon)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(salon.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            salon.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={salon.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(salon)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSalon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Детали салона</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ID</p>
                  <p className="font-semibold text-gray-900">#{selectedSalon.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Название</p>
                  <p className="font-semibold text-gray-900">{selectedSalon.name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Адрес</p>
                  <p className="font-semibold text-gray-900">{selectedSalon.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Телефон</p>
                  <p className="font-semibold text-gray-900">{selectedSalon.phone || 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Рейтинг</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSalon.rating?.toFixed(1) || '0.0'} ({selectedSalon.reviews_count || 0} отзывов)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Владелец ID</p>
                  <p className="font-semibold text-gray-900">{selectedSalon.owner_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Статус</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSalon.is_active ? 'Активен' : 'Неактивен'}
                  </p>
                </div>
                {selectedSalon.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Описание</p>
                    <p className="text-gray-900">{selectedSalon.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedSalon(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
