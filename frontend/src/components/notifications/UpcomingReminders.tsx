import { useState, useEffect } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { notificationsApi, UpcomingReminder } from '../../api/notifications'

export default function UpcomingReminders() {
  const [reminders, setReminders] = useState<UpcomingReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReminders()
    // Refresh every minute
    const interval = setInterval(loadReminders, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadReminders = async () => {
    try {
      const data = await notificationsApi.getUpcomingReminders()
      setReminders(data)
    } catch (error) {
      console.error('Failed to load reminders:', error)
      // Don't throw - just set empty reminders
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (reminders.length === 0) {
    return null
  }

  const getUrgencyColor = (hoursUntil: number) => {
    if (hoursUntil <= 1) return 'from-red-500 to-orange-500'
    if (hoursUntil <= 24) return 'from-orange-500 to-yellow-500'
    return 'from-yellow-500 to-green-500'
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-bold text-gray-900">
          Предстоящие записи
        </h2>
      </div>

      <div className="grid gap-4">
        {reminders.map((reminder, index) => (
          <div
            key={reminder.booking_id}
            className={`relative overflow-hidden bg-gradient-to-r ${getUrgencyColor(
              reminder.time_until
            )} rounded-xl shadow-lg p-6 text-white`}
            style={{
              animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
            }}
          >
            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold mb-1">
                    {reminder.message}
                  </p>
                  <p className="text-white/90 text-sm">
                    Не забудьте про вашу запись!
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
