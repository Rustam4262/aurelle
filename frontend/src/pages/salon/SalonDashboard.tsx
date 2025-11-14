import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Calendar, Package, Users, LogOut } from 'lucide-react'

export default function SalonDashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon - Кабинет салона</div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Панель управления</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/salon/bookings"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Записи</h3>
                <p className="text-gray-600 text-sm">Управление бронями</p>
              </div>
            </div>
          </Link>

          <Link
            to="/salon/services"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Услуги</h3>
                <p className="text-gray-600 text-sm">Прайс-лист</p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Мастера</h3>
                <p className="text-gray-600 text-sm">Команда</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Статистика</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Записей сегодня</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Услуг</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-gray-600">Мастеров</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
