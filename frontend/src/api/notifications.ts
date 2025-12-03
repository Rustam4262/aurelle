import { apiClient } from './client'

export interface Notification {
  id: number
  user_id: number
  booking_id: number | null
  type: string
  title: string
  message: string
  is_read: number
  sent_at: string
  scheduled_for: string | null
}

export interface UpcomingReminder {
  booking_id: number
  message: string
  time_until: number
}

export const notificationsApi = {
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications', {
      params: { unread_only: unreadOnly, limit },
    })
    return response.data
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/mark-read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/mark-all-read')
  },

  getUpcomingReminders: async (): Promise<UpcomingReminder[]> => {
    const response = await apiClient.get('/notifications/upcoming-reminders')
    return response.data.reminders
  },
}
