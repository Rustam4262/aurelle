import { Link } from 'react-router-dom'
import { Search, Calendar, Star } from 'lucide-react'

interface Props {
  activeBookingsCount: number
  favoritesCount: number
}

export default function QuickActions({ activeBookingsCount, favoritesCount }: Props) {
  const actions = [
    {
      to: '/client/salons',
      icon: Search,
      title: 'Найти салон',
      subtitle: 'Поиск по карте и списку',
      count: null,
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      to: '/client/bookings',
      icon: Calendar,
      title: 'Мои записи',
      subtitle: 'История и активные визиты',
      count: activeBookingsCount,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      to: '/client/favorites',
      icon: Star,
      title: 'Избранное',
      subtitle: 'Ваши любимые салоны',
      count: favoritesCount,
      gradient: 'from-rose-500 to-orange-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <Link
            key={action.to}
            to={action.to}
            className="group relative bg-white p-6 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden"
            style={{
              animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
            }}
          >
            {/* Background gradient on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

            {/* Content */}
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`bg-gradient-to-br ${action.gradient} p-4 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {action.count !== null && action.count > 0 && (
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    {action.count}
                  </span>
                )}
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700">{action.subtitle}</p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center text-pink-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2">
                <span className="text-sm font-medium">Перейти</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
