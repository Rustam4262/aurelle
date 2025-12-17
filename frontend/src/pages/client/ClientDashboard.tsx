import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LogOut, User, Bell, Calendar, Heart, Clock, TrendingUp, Star, MapPin, Sparkles } from 'lucide-react'
import { bookingsApi, type DetailedBooking } from '../../api/bookings'
import { salonsApi } from '../../api/salons'
// import { favoritesApi } from '../../api/favorites'  // MVP: disabled
// import { recommendationsApi } from '../../api/recommendations'  // MVP: disabled
import { Salon } from '../../api/types'
import UpcomingBookingCard from '../../components/dashboard/UpcomingBookingCard'
import QuickActions from '../../components/dashboard/QuickActions'
import RecentBookings from '../../components/dashboard/RecentBookings'
// import FavoriteSalons from '../../components/dashboard/FavoriteSalons'  // MVP: disabled
// import RecommendedSalons from '../../components/dashboard/RecommendedSalons'  // MVP: disabled
import VisitHistory from '../../components/history/VisitHistory'
import UpcomingReminders from '../../components/notifications/UpcomingReminders'

export default function ClientDashboard() {
  const { user, logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [upcomingBooking, setUpcomingBooking] = useState<DetailedBooking | null>(null)
  const [recentBookings, setRecentBookings] = useState<DetailedBooking[]>([])
  // const [favoriteSalons, setFavoriteSalons] = useState<Salon[]>([])  // MVP: disabled
  // const [recommendedSalons, setRecommendedSalons] = useState<Salon[]>([])  // MVP: disabled
  const [stats, setStats] = useState({
    activeBookings: 0,
    favoritesCount: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load all bookings with detailed info
      const bookings = await bookingsApi.getMyBookingsDetailed({ limit: 50 })

      // Find upcoming booking (nearest future booking)
      const now = new Date()
      const futureBookings = bookings
        .filter(b => {
          const bookingDate = new Date(b.start_at)
          return bookingDate > now && b.status !== 'cancelled_by_client' && b.status !== 'cancelled_by_salon'
        })
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

      if (futureBookings.length > 0) {
        setUpcomingBooking(futureBookings[0])
      }

      // Get recent bookings for history
      setRecentBookings(bookings)

      // Count active bookings
      const activeCount = bookings.filter(b =>
        b.status === 'pending' || b.status === 'confirmed'
      ).length
      setStats(prev => ({ ...prev, activeBookings: activeCount }))

      // MVP: Recommendations disabled
      // const recommendations = await recommendationsApi.getPersonalized(6)
      // setRecommendedSalons(recommendations)

      // MVP: Favorites disabled
      // try {
      //   const favorites = await favoritesApi.getFavorites()
      //   setFavoriteSalons(favorites)
      //   setStats(prev => ({ ...prev, favoritesCount: favorites.length }))
      // } catch (error) {
      //   console.error('Error loading favorites:', error)
      // }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!upcomingBooking) return

    if (confirm('Вы уверены, что хотите отменить эту запись?')) {
      try {
        await bookingsApi.cancelBooking(upcomingBooking.id)
        loadDashboardData() // Reload data
      } catch (error) {
        console.error('Error canceling booking:', error)
        alert('Не удалось отменить запись')
      }
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <nav className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Beauty Salon
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium hidden sm:block">
              Привет, <span className="text-pink-500">{user?.name}</span>
            </span>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
            </button>
            <Link
              to="/client/profile"
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Профиль</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-3xl p-8 mb-8 text-white shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <h1 className="text-4xl font-bold">Привет, {user?.name}!</h1>
              </div>
              <p className="text-pink-100 text-lg">Время для вашей красоты и ухода ✨</p>
            </div>
            <div className="hidden md:flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center transform hover:scale-105 transition-all">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{stats.activeBookings}</p>
                <p className="text-sm text-pink-100">Активных записей</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center transform hover:scale-105 transition-all">
                <Heart className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{stats.favoritesCount}</p>
                <p className="text-sm text-pink-100">Избранных</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Reminders */}
        <UpcomingReminders />

        {/* Upcoming Booking */}
        <UpcomingBookingCard booking={upcomingBooking} onCancel={handleCancelBooking} />

        {/* Quick Actions */}
        <QuickActions
          activeBookingsCount={stats.activeBookings}
          favoritesCount={stats.favoritesCount}
        />

        {/* Two Column Grid - Recent Bookings and Favorites */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <RecentBookings bookings={recentBookings} />
          {/* MVP: Favorites disabled */}
          {/* <FavoriteSalons salons={favoriteSalons} /> */}
        </div>

        {/* MVP: Recommended Salons disabled */}
        {/* <RecommendedSalons salons={recommendedSalons} /> */}

        {/* Visit History */}
        <div className="mt-12">
          <VisitHistory />
        </div>

        {/* Footer spacing */}
        <div className="h-12"></div>
      </div>

      {/* Mobile FAB - Floating Action Button */}
      <Link
        to="/client/salons"
        className="md:hidden fixed bottom-6 right-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Link>
    </div>
  )
}

// Skeleton Loading Component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30">
      {/* Header Skeleton */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
        <nav className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="h-8 w-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </nav>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Welcome Banner Skeleton */}
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl p-8 mb-8 shadow-2xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-10 w-64 bg-white/50 rounded mb-3"></div>
              <div className="h-6 w-96 bg-white/30 rounded"></div>
            </div>
            <div className="hidden md:flex gap-4">
              <div className="bg-white/20 rounded-2xl px-6 py-4 w-32 h-32"></div>
              <div className="bg-white/20 rounded-2xl px-6 py-4 w-32 h-32"></div>
            </div>
          </div>
        </div>

        {/* Upcoming booking skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex justify-between mb-4">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
                <div className="w-8 h-6 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Two column skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recommended skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
