import { useState, useEffect } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { notificationsApi, Notification } from '../../api/notifications'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export default function NotificationBell() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationsApi.getNotifications(false, 20)
      setNotifications(data)
      setUnreadCount(data.filter((n) => n.is_read === 0).length)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      // Don't throw - just set empty notifications
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '🔔'
      case 'confirmation':
        return '✅'
      case 'cancellation':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowPanel(!showPanel)
          if (!showPanel) loadNotifications()
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-pink-500 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col animate-slideDown">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pink-500 to-purple-500">
              <h3 className="text-lg font-semibold text-white">Уведомления</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Все прочитано
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Нет уведомлений</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        notification.is_read === 0 ? 'bg-pink-50' : ''
                      }`}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                      }}
                      onClick={() => {
                        if (notification.is_read === 0) {
                          handleMarkAsRead(notification.id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            {notification.is_read === 0 && (
                              <span className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>
                              {format(
                                new Date(notification.sent_at),
                                'd MMM, HH:mm',
                                { locale: ru }
                              )}
                            </span>
                            {notification.is_read === 1 && (
                              <span className="flex items-center gap-1 text-green-500">
                                <Check className="w-3 h-3" />
                                Прочитано
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
