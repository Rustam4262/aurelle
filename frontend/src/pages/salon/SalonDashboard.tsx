import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { salonsApi } from '../../api/salons'
import { servicesApi } from '../../api/services'
import { serviceMastersApi } from '../../api/serviceMasters'
import { statisticsApi, SalonStatistics } from '../../api/statistics'
import {
  Calendar, Package, Users, LogOut, TrendingUp, DollarSign,
  Star, Activity, Clock, Image, Edit, AlertTriangle, Bell,
  BarChart3, Sparkles, ArrowUpRight, MessageSquare, Menu, X
} from 'lucide-react'

export default function SalonDashboard() {
  const { user, logout } = useAuthStore()
  const [statistics, setStatistics] = useState<SalonStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<number | null>(null)
  const [servicesWithoutMasters, setServicesWithoutMasters] = useState<Array<{id: number, title: string}>>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadSalonData()
  }, [])

  const loadSalonData = async () => {
    try {
      const salons = await salonsApi.getMySalons()
      if (salons.length > 0) {
        const salon = salons[0]
        setSalonId(salon.id)
        const stats = await statisticsApi.getSalonStatistics(salon.id)
        setStatistics(stats)

        // Проверка услуг без назначенных мастеров
        const services = await servicesApi.getServices({ salon_id: salon.id })
        const servicesWithNoMasters = []

        for (const service of services) {
          try {
            const masterIds = await serviceMastersApi.getMastersByService(service.id)
            if (masterIds.length === 0) {
              servicesWithNoMasters.push({ id: service.id, title: service.title })
            }
          } catch (error) {
            console.error(`Error checking masters for service ${service.id}:`, error)
          }
        }

        setServicesWithoutMasters(servicesWithNoMasters)
      }
    } catch (error) {
      console.error('Error loading salon data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!statistics) {
    return <OnboardingView user={user} logout={logout} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100 sticky top-0 z-50">
        <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Beauty Salon
              </div>
              <div className="text-xs text-gray-500 font-medium hidden sm:block">Кабинет салона</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-gray-700 font-semibold hidden md:block">
              {user?.name}
            </span>
            <button className="relative p-2 hover:bg-pink-50 rounded-xl transition-all hover:scale-110">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
            </button>
            <button
              onClick={logout}
              className="hidden sm:flex items-center space-x-2 px-3 sm:px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden lg:inline">Выйти</span>
            </button>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-pink-50 rounded-xl transition-all"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white/95 backdrop-blur-md border-t border-pink-100 px-4 py-4">
            <div className="space-y-2">
              <MobileNavItem to="/salon/dashboard" icon={Activity} label="Обзор" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/bookings" icon={Calendar} label="Записи" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/services" icon={Package} label="Услуги" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/masters" icon={Users} label="Мастера" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/schedule" icon={Clock} label="Расписание" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/photos" icon={Image} label="Фото" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/reviews" icon={MessageSquare} label="Отзывы" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavItem to="/salon/edit" icon={Edit} label="Настройки" onClick={() => setMobileMenuOpen(false)} />
              <button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Привет, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 text-base sm:text-lg font-medium px-4">Вот как идут дела в <span className="text-pink-600 font-bold">{statistics.salon_name}</span></p>
        </div>

        {/* Warning Alert */}
        {servicesWithoutMasters.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-2">
                  ⚠️ Требуется внимание
                </h3>
                <p className="text-amber-800 mb-3">
                  {servicesWithoutMasters.length === 1
                    ? 'У одной услуги не назначены мастера.'
                    : `У ${servicesWithoutMasters.length} услуг не назначены мастера.`
                  } Клиенты не смогут записаться.
                </p>
                <Link
                  to="/salon/services"
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold transition-all transform hover:scale-105"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Назначить мастеров
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics - Big Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Calendar}
            value={statistics.bookings.today}
            label="Записей сегодня"
            gradient="from-blue-500 to-cyan-500"
            to="/salon/bookings"
          />
          <MetricCard
            icon={DollarSign}
            value={`${statistics.revenue.month} ₽`}
            label="Выручка за месяц"
            gradient="from-green-500 to-emerald-500"
            valueSize="text-2xl"
          />
          <MetricCard
            icon={Users}
            value={statistics.total.masters}
            label="Активных мастеров"
            gradient="from-purple-500 to-pink-500"
            to="/salon/masters"
          />
          <Link
            to="/salon/reviews"
            className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </div>
            <div className="text-white">
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-4xl font-bold">{statistics.salon_rating.toFixed(1)}</span>
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div className="text-white/90 text-sm font-medium">
                {statistics.total.reviews} отзывов
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-3 mb-8 border border-pink-100">
          <div className="flex flex-wrap gap-2">
            <NavTab
              to="/salon/dashboard"
              icon={Activity}
              label="Обзор"
              isActive={true}
            />
            <NavTab
              to="/salon/bookings"
              icon={Calendar}
              label="Записи"
              badge={statistics.bookings.by_status.pending}
            />
            <NavTab
              to="/salon/services"
              icon={Package}
              label="Услуги"
              badge={statistics.total.services}
            />
            <NavTab
              to="/salon/masters"
              icon={Users}
              label="Мастера"
              badge={statistics.total.masters}
            />
            <NavTab
              to="/salon/schedule"
              icon={Clock}
              label="Расписание"
            />
            <NavTab
              to="/salon/photos"
              icon={Image}
              label="Фото"
            />
            <NavTab
              to="/salon/reviews"
              icon={MessageSquare}
              label="Отзывы"
              badge={statistics.total.reviews}
            />
            <NavTab
              to="/salon/edit"
              icon={Edit}
              label="Настройки"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard
            to="/salon/services"
            icon={Package}
            title="Услуги"
            subtitle={`${statistics.total.services} активных`}
            gradient="from-pink-500 to-rose-500"
          />
          <QuickActionCard
            to="/salon/schedule"
            icon={Clock}
            title="Расписание"
            subtitle="Настроить часы"
            gradient="from-blue-500 to-indigo-500"
          />
          <QuickActionCard
            to="/salon/photos"
            icon={Image}
            title="Фото салона"
            subtitle="Добавить фото"
            gradient="from-purple-500 to-pink-500"
          />
          <QuickActionCard
            to="/salon/edit"
            icon={Edit}
            title="Настройки"
            subtitle="Редактировать профиль"
            gradient="from-gray-600 to-gray-700"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Bookings Stats */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-pink-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Статистика записей</h3>
                  <p className="text-sm text-gray-500 font-medium">Динамика бронирований</p>
                </div>
              </div>
              <Link to="/salon/bookings" className="text-sm text-pink-600 hover:text-pink-700 font-bold group flex items-center px-3 py-2 bg-pink-50 hover:bg-pink-100 rounded-xl transition-all">
                Все записи
                <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatItem label="За неделю" value={statistics.bookings.week} color="text-pink-600" bgColor="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200" />
              <StatItem label="За месяц" value={statistics.bookings.month} color="text-purple-600" bgColor="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200" />
              <StatItem label="Всего" value={statistics.total.bookings} color="text-gray-900" bgColor="bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-300" />
            </div>

            <div className="border-t-2 border-pink-100 pt-5">
              <div className="text-sm font-bold text-gray-800 mb-4">По статусам</div>
              <div className="grid grid-cols-2 gap-3">
                <StatusBadge status="pending" label="Ожидают" count={statistics.bookings.by_status.pending} />
                <StatusBadge status="confirmed" label="Подтверждены" count={statistics.bookings.by_status.confirmed} />
                <StatusBadge status="completed" label="Завершены" count={statistics.bookings.by_status.completed} />
                <StatusBadge status="cancelled" label="Отменены" count={statistics.bookings.by_status.cancelled} />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Выручка</h3>
                <p className="text-sm text-green-700 font-semibold">Завершенные услуги</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-sm font-bold text-gray-700 mb-2">За месяц</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {statistics.revenue.month.toLocaleString()} ₽
                </div>
              </div>
              <div className="border-t-2 border-green-200 pt-4">
                <div className="text-sm font-bold text-gray-700 mb-2">Общая выручка</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.revenue.total.toLocaleString()} ₽
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid md:grid-cols-2 gap-6">
          <TopList
            title="🏆 Топ мастеров"
            subtitle="По количеству записей"
            items={statistics.top_masters.map((m, idx) => ({
              rank: idx + 1,
              name: m.master_name,
              count: m.booking_count
            }))}
            gradient="from-purple-500 to-pink-500"
          />
          <TopList
            title="⭐ Топ услуг"
            subtitle="Самые популярные"
            items={statistics.top_services.map((s, idx) => ({
              rank: idx + 1,
              name: s.service_name,
              count: s.booking_count
            }))}
            gradient="from-blue-500 to-cyan-500"
          />
        </div>
      </div>
    </div>
  )
}

// Components
interface MetricCardProps {
  icon: React.ElementType
  value: number | string
  label: string
  gradient: string
  to?: string
  valueSize?: string
}

function MetricCard({ icon: Icon, value, label, gradient, to, valueSize = "text-4xl" }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Icon className="w-7 h-7 text-white" />
        </div>
        {to && <ArrowUpRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />}
      </div>
      <div className="text-white">
        <div className={`${valueSize} font-bold mb-2`}>{value}</div>
        <div className="text-white/90 text-sm font-semibold">{label}</div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={`bg-gradient-to-br ${gradient} rounded-2xl p-7 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 hover:scale-105 group`}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-7 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}>
      {content}
    </div>
  )
}

interface MobileNavItemProps {
  to: string
  icon: React.ElementType
  label: string
  onClick: () => void
}

function MobileNavItem({ to, icon: Icon, label, onClick }: MobileNavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 rounded-xl transition-all font-semibold hover:text-pink-700"
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  )
}

interface NavTabProps {
  to: string
  icon: React.ElementType
  label: string
  isActive?: boolean
  badge?: number
}

function NavTab({ to, icon: Icon, label, isActive = false, badge }: NavTabProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${
        isActive
          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
          : 'bg-white hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 text-gray-700 hover:text-pink-700 border border-gray-200 hover:border-pink-300'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
          isActive
            ? 'bg-white/20 text-white'
            : 'bg-pink-100 text-pink-700'
        }`}>
          {badge}
        </span>
      )}
    </Link>
  )
}

interface QuickActionCardProps {
  to: string
  icon: React.ElementType
  title: string
  subtitle: string
  gradient: string
}

function QuickActionCard({ to, icon: Icon, title, subtitle, gradient }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all transform hover:-translate-y-1 hover:scale-105 group"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-base">{title}</h3>
      <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
    </Link>
  )
}

function StatItem({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl p-4 text-center hover:scale-105 transition-transform`}>
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
    </div>
  )
}

function StatusBadge({ status, label, count }: { status: string; label: string; count: number }) {
  const colors = {
    pending: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    confirmed: 'bg-blue-50 text-blue-800 border-blue-300',
    completed: 'bg-green-50 text-green-800 border-green-300',
    cancelled: 'bg-red-50 text-red-800 border-red-300'
  }

  return (
    <div className={`${colors[status as keyof typeof colors]} rounded-xl p-3 border-2 flex items-center justify-between hover:scale-105 transition-transform`}>
      <span className="font-semibold text-sm">{label}</span>
      <span className="font-bold text-xl">{count}</span>
    </div>
  )
}

interface TopListProps {
  title: string
  subtitle: string
  items: Array<{ rank: number; name: string; count: number }>
  gradient: string
}

function TopList({ title, subtitle, items, gradient }: TopListProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-pink-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center space-x-3 mb-6">
        <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}>
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-pink-50/30 rounded-xl hover:from-pink-50 hover:to-purple-50 transition-all transform hover:scale-105 border border-gray-100 hover:border-pink-200"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-white font-bold text-base">{item.rank}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.name}</span>
              </div>
              <span className="text-gray-700 font-bold text-lg">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Нет данных</p>
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-pink-100">
        <nav className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="h-10 w-48 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse"></div>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-32 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-10 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full animate-pulse"></div>
          </div>
        </nav>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8">
          <div className="h-14 w-96 bg-gradient-to-r from-pink-200 to-purple-200 rounded-2xl animate-pulse mb-3 mx-auto"></div>
          <div className="h-6 w-64 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-pink-100">
              <div className="h-12 w-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-xl animate-pulse mb-4"></div>
              <div className="h-10 w-20 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse"></div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg h-64 border border-pink-100">
              <div className="h-6 w-48 bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OnboardingView({ user, logout }: { user: any; logout: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Beauty Salon
          </div>
          <button onClick={logout} className="flex items-center space-x-2 text-gray-700 hover:text-pink-600">
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Package className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Начните свой путь к успеху - создайте свой первый салон красоты
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Принимайте записи</h3>
                <p className="text-sm text-gray-600">Клиенты смогут бронировать услуги онлайн 24/7</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Управляйте командой</h3>
                <p className="text-sm text-gray-600">Добавляйте мастеров и следите за их загрузкой</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Растите бизнес</h3>
                <p className="text-sm text-gray-600">Анализируйте статистику и увеличивайте прибыль</p>
              </div>
            </div>
          </div>

          <Link
            to="/salon/create"
            className="inline-flex items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white px-12 py-5 rounded-2xl hover:shadow-2xl font-bold text-lg transition-all transform hover:scale-105"
          >
            <Sparkles className="w-6 h-6 mr-3" />
            Создать салон
            <ArrowUpRight className="w-5 h-5 ml-2" />
          </Link>

          <p className="text-sm text-gray-500 mt-6">
            Это займёт всего 2-3 минуты ⏱️
          </p>
        </div>
      </div>
    </div>
  )
}
