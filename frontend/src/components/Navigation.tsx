import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Home, Calendar, Heart, User, Building, Package, Users, Clock, Image, Star, UserCircle } from 'lucide-react'

export default function Navigation() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  const linkClass = (path: string) => {
    return `flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      isActive(path)
        ? 'bg-primary-100 text-primary-700 font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`
  }

  // Навигация для клиента
  if (user?.role === 'client') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/client/dashboard" className="text-2xl font-bold text-primary-600">
                Beauty Salon
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Привет, {user.name}</span>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </nav>
        </header>

        <div className="flex max-w-7xl mx-auto">
          {/* Sidebar */}
          <aside className="w-64 bg-white min-h-[calc(100vh-73px)] shadow-sm p-4">
            <nav className="space-y-2">
              <Link to="/client/dashboard" className={linkClass('/client/dashboard')}>
                <Home className="w-5 h-5" />
                <span>Главная</span>
              </Link>
              <Link to="/client/salons" className={linkClass('/client/salons')}>
                <Building className="w-5 h-5" />
                <span>Салоны</span>
              </Link>
              <Link to="/client/bookings" className={linkClass('/client/bookings')}>
                <Calendar className="w-5 h-5" />
                <span>Мои записи</span>
              </Link>
              <Link to="/client/favorites" className={linkClass('/client/favorites')}>
                <Heart className="w-5 h-5" />
                <span>Избранное</span>
              </Link>
              <Link to="/client/profile" className={linkClass('/client/profile')}>
                <User className="w-5 h-5" />
                <span>Профиль</span>
              </Link>
            </nav>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-h-[calc(100vh-73px)]">
            {/* Content will be rendered here via routing */}
          </main>
        </div>
      </div>
    )
  }

  // Навигация для владельца салона
  if (user?.role === 'salon_owner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/salon/dashboard" className="text-2xl font-bold text-primary-600">
                Beauty Salon - Кабинет салона
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{user.name}</span>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </nav>
        </header>

        <div className="flex max-w-7xl mx-auto">
          {/* Sidebar */}
          <aside className="w-64 bg-white min-h-[calc(100vh-73px)] shadow-sm p-4">
            <nav className="space-y-2">
              <Link to="/salon/dashboard" className={linkClass('/salon/dashboard')}>
                <Home className="w-5 h-5" />
                <span>Панель управления</span>
              </Link>
              <Link to="/salon/bookings" className={linkClass('/salon/bookings')}>
                <Calendar className="w-5 h-5" />
                <span>Записи</span>
              </Link>
              <Link to="/salon/services" className={linkClass('/salon/services')}>
                <Package className="w-5 h-5" />
                <span>Услуги</span>
              </Link>
              <Link to="/salon/masters" className={linkClass('/salon/masters')}>
                <Users className="w-5 h-5" />
                <span>Мастера</span>
              </Link>
              <Link to="/salon/schedule" className={linkClass('/salon/schedule')}>
                <Clock className="w-5 h-5" />
                <span>Расписание</span>
              </Link>
              <Link to="/salon/photos" className={linkClass('/salon/photos')}>
                <Image className="w-5 h-5" />
                <span>Фотографии</span>
              </Link>
              <Link to="/salon/reviews" className={linkClass('/salon/reviews')}>
                <Star className="w-5 h-5" />
                <span>Отзывы</span>
              </Link>
            </nav>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-h-[calc(100vh-73px)]">
            {/* Content will be rendered here via routing */}
          </main>
        </div>
      </div>
    )
  }

  // Навигация для администратора
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/admin/dashboard" className="text-2xl font-bold text-primary-600">
                Beauty Salon - Админ-панель
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{user.name}</span>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </nav>
        </header>

        <div className="flex max-w-7xl mx-auto">
          {/* Sidebar */}
          <aside className="w-64 bg-white min-h-[calc(100vh-73px)] shadow-sm p-4">
            <nav className="space-y-2">
              <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>
                <Home className="w-5 h-5" />
                <span>Панель управления</span>
              </Link>
              <Link to="/admin/users" className={linkClass('/admin/users')}>
                <UserCircle className="w-5 h-5" />
                <span>Пользователи</span>
              </Link>
            </nav>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-h-[calc(100vh-73px)]">
            {/* Content will be rendered here via routing */}
          </main>
        </div>
      </div>
    )
  }

  return null
}
