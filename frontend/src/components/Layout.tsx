import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Home, Calendar, Heart, User, Building, Package, Users, Clock, Image, Star, UserCircle } from 'lucide-react'
import NotificationBell from './notifications/NotificationBell'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const { t } = useTranslation()

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
  const renderClientNav = () => (
    <>
      <Link to="/client/dashboard" className={linkClass('/client/dashboard')}>
        <Home className="w-5 h-5" />
        <span>{t('nav.home')}</span>
      </Link>
      <Link to="/client/salons" className={linkClass('/client/salons')}>
        <Building className="w-5 h-5" />
        <span>{t('nav.salons')}</span>
      </Link>
      <Link to="/client/bookings" className={linkClass('/client/bookings')}>
        <Calendar className="w-5 h-5" />
        <span>{t('nav.myBookings')}</span>
      </Link>
      <Link to="/client/favorites" className={linkClass('/client/favorites')}>
        <Heart className="w-5 h-5" />
        <span>{t('nav.favorites')}</span>
      </Link>
      <Link to="/client/profile" className={linkClass('/client/profile')}>
        <User className="w-5 h-5" />
        <span>{t('nav.profile')}</span>
      </Link>
    </>
  )

  // Навигация для владельца салона
  const renderSalonOwnerNav = () => (
    <>
      <Link to="/salon/dashboard" className={linkClass('/salon/dashboard')}>
        <Home className="w-5 h-5" />
        <span>{t('nav.dashboard')}</span>
      </Link>
      <Link to="/salon/bookings" className={linkClass('/salon/bookings')}>
        <Calendar className="w-5 h-5" />
        <span>{t('nav.manageBookings')}</span>
      </Link>
      <Link to="/salon/services" className={linkClass('/salon/services')}>
        <Package className="w-5 h-5" />
        <span>{t('nav.manageServices')}</span>
      </Link>
      <Link to="/salon/masters" className={linkClass('/salon/masters')}>
        <Users className="w-5 h-5" />
        <span>{t('nav.manageMasters')}</span>
      </Link>
      <Link to="/salon/schedule" className={linkClass('/salon/schedule')}>
        <Clock className="w-5 h-5" />
        <span>{t('salon.schedule')}</span>
      </Link>
      <Link to="/salon/photos" className={linkClass('/salon/photos')}>
        <Image className="w-5 h-5" />
        <span>Фотографии</span>
      </Link>
      <Link to="/salon/reviews" className={linkClass('/salon/reviews')}>
        <Star className="w-5 h-5" />
        <span>{t('review.reviews')}</span>
      </Link>
    </>
  )

  // Навигация для администратора
  const renderAdminNav = () => (
    <>
      <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>
        <Home className="w-5 h-5" />
        <span>{t('nav.dashboard')}</span>
      </Link>
      <Link to="/admin/users" className={linkClass('/admin/users')}>
        <UserCircle className="w-5 h-5" />
        <span>{t('admin.users')}</span>
      </Link>
    </>
  )

  const getTitle = () => {
    if (user?.role === 'client') return 'Beauty Salon'
    if (user?.role === 'salon_owner') return 'Beauty Salon - Кабинет салона'
    if (user?.role === 'admin') return 'Beauty Salon - Админ-панель'
    return 'Beauty Salon'
  }

  const getDashboardPath = () => {
    if (user?.role === 'client') return '/client/dashboard'
    if (user?.role === 'salon_owner') return '/salon/dashboard'
    if (user?.role === 'admin') return '/admin/dashboard'
    return '/'
  }

  const renderNav = () => {
    if (user?.role === 'client') return renderClientNav()
    if (user?.role === 'salon_owner') return renderSalonOwnerNav()
    if (user?.role === 'admin') return renderAdminNav()
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={getDashboardPath()} className="text-2xl font-bold text-primary-600">
              {getTitle()}
            </Link>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <NotificationBell />
              <span className="text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] shadow-sm p-4">
          <nav className="space-y-2">
            {renderNav()}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-h-[calc(100vh-73px)] bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
