import { useState, useEffect } from 'react'
import { adminApi, AdminUser } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import {
  Users, Search, Filter, UserCheck, UserX,
  Shield, Store, Scissors, User as UserIcon, Eye, Power
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export default function ManageUsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 500 }
      if (roleFilter !== 'all') {
        params.role = roleFilter
      }
      const data = await adminApi.getAllUsers(params)
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (userId: number) => {
    if (userId === currentUser?.id) {
      alert('Нельзя деактивировать самого себя')
      return
    }

    if (!confirm('Вы уверены, что хотите изменить статус пользователя?')) return

    try {
      const result = await adminApi.toggleUserActive(userId)
      alert(result.message)
      loadUsers()
    } catch (error) {
      console.error('Failed to toggle user:', error)
      alert('Ошибка при изменении статуса пользователя')
    }
  }

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; icon: any; className: string }> = {
      admin: {
        label: 'Администратор',
        icon: Shield,
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      },
      salon_owner: {
        label: 'Владелец салона',
        icon: Store,
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      master: {
        label: 'Мастер',
        icon: Scissors,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      client: {
        label: 'Клиент',
        icon: UserIcon,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    const config = roleConfig[role] || roleConfig.client
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const getFilteredUsers = () => {
    if (!searchQuery.trim()) {
      return users
    }

    const query = searchQuery.toLowerCase()
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      user.id.toString().includes(query)
    )
  }

  const filteredUsers = getFilteredUsers()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка пользователей...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="w-8 h-8 mr-3 text-pink-500" />
          Управление пользователями
        </h1>
        <p className="text-gray-600 mt-2">
          Управление всеми пользователями платформы
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
                placeholder="Поиск по имени, телефону, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="salon_owner">Владельцы салонов</option>
              <option value="master">Мастера</option>
              <option value="client">Клиенты</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-gray-600">Администраторов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'salon_owner').length}
            </p>
            <p className="text-sm text-gray-600">Владельцев</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'master').length}
            </p>
            <p className="text-sm text-gray-600">Мастеров</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {users.filter(u => u.role === 'client').length}
            </p>
            <p className="text-sm text-gray-600">Клиентов</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Имя</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Контакты</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Роль</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Статус</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase">Регистрация</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">#{user.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-pink-600 font-semibold">Вы</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{user.phone}</div>
                      {user.email && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          <UserX className="w-3 h-3 mr-1" />
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(parseISO(user.created_at), 'd MMM yyyy', { locale: ru })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          disabled={user.id === currentUser?.id}
                          className={`p-2 rounded-lg transition-colors ${
                            user.id === currentUser?.id
                              ? 'text-gray-400 cursor-not-allowed'
                              : user.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.id === currentUser?.id ? 'Вы' : user.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          <Power className="w-4 h-4" />
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
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Профиль пользователя</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ID</p>
                  <p className="font-semibold text-gray-900">#{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Имя</p>
                  <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Телефон</p>
                  <p className="font-semibold text-gray-900">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{selectedUser.email || 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Роль</p>
                  {getRoleBadge(selectedUser.role)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Статус</p>
                  <p className="font-semibold text-gray-900">
                    {selectedUser.is_active ? 'Активен' : 'Неактивен'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Дата регистрации</p>
                  <p className="font-semibold text-gray-900">
                    {format(parseISO(selectedUser.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {selectedUser.id !== currentUser?.id && (
                <button
                  onClick={() => {
                    handleToggleActive(selectedUser.id)
                    setSelectedUser(null)
                  }}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedUser.is_active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedUser.is_active ? 'Деактивировать' : 'Активировать'}
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
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
