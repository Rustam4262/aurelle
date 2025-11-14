import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Users, Building2, FileText, LogOut } from 'lucide-react'

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon - Админ</div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{user?.name}</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Панель администратора</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Пользователи</h3>
                <p className="text-gray-600 text-sm">Управление</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Салоны</h3>
                <p className="text-gray-600 text-sm">Модерация</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Отзывы</h3>
                <p className="text-gray-600 text-sm">Модерация</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Общая статистика</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Пользователей</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Салонов</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Записей</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Отзывов</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
