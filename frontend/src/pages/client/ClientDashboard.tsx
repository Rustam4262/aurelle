import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Calendar, Search, Star, LogOut } from 'lucide-react'

export default function ClientDashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">Beauty Salon</div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Привет, {user?.name}</span>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Личный кабинет</h1>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/client/salons"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Search className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Найти салон</h3>
                <p className="text-gray-600 text-sm">Поиск и бронирование</p>
              </div>
            </div>
          </Link>

          <Link
            to="/client/bookings"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Мои записи</h3>
                <p className="text-gray-600 text-sm">История и активные</p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Star className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Избранное</h3>
                <p className="text-gray-600 text-sm">Ваши салоны</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Последние записи</h2>
          <p className="text-gray-600">У вас пока нет записей</p>
          <Link
            to="/client/salons"
            className="mt-4 inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Найти салон
          </Link>
        </div>
      </div>
    </div>
  )
}
