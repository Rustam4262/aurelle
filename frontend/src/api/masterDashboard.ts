import { apiClient } from './client'

export interface MasterSchedule {
  id: number
  master_id: number
  day_of_week: number  // 0 = Monday, 6 = Sunday
  start_time: string   // HH:MM format
  end_time: string
  break_start?: string
  break_end?: string
  is_active: boolean
}

export interface MasterDayOff {
  id: number
  master_id: number
  date: string  // YYYY-MM-DD
  reason?: string
}

export interface MasterInfo {
  id: number
  name: string
  phone?: string
  description?: string
  specialization?: string
  experience_years: number
  rating: number
  reviews_count: number
  avatar_url?: string
  is_active: boolean
  salon?: {
    id: number
    name: string
    address: string
    phone: string
  }
  services?: Array<{
    id: number
    title: string
    price: number
    duration_minutes: number
    category?: string
  }>
}

export interface CalendarBooking {
  id: number
  start_at: string  // ISO datetime
  end_at: string
  status: string
  service_title: string
  client_id: number
  client_notes?: string
  price: number
}

export interface CalendarData {
  bookings: CalendarBooking[]
  schedules: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    break_start?: string
    break_end?: string
  }>
  day_offs: Array<{
    date: string
    reason?: string
  }>
}

export const masterDashboardApi = {
  // Get master info
  getMasterInfo: async (): Promise<MasterInfo> => {
    const response = await apiClient.get('/master/me')
    return response.data
  },

  // Bookings
  getBookings: async (params?: {
    date_from?: string
    date_to?: string
    status_filter?: string
    skip?: number
    limit?: number
  }) => {
    const response = await apiClient.get('/master/bookings', { params })
    return response.data
  },

  // Calendar
  getCalendar: async (dateFrom: string, dateTo: string): Promise<CalendarData> => {
    const response = await apiClient.get('/master/calendar', {
      params: { date_from: dateFrom, date_to: dateTo }
    })
    return response.data
  },

  // Schedule management
  getSchedule: async (): Promise<MasterSchedule[]> => {
    const response = await apiClient.get('/master/schedule')
    return response.data
  },

  createSchedule: async (data: {
    day_of_week: number
    start_time: string
    end_time: string
    break_start?: string
    break_end?: string
  }): Promise<MasterSchedule> => {
    const response = await apiClient.post('/master/schedule', data)
    return response.data
  },

  updateSchedule: async (scheduleId: number, data: {
    start_time?: string
    end_time?: string
    break_start?: string
    break_end?: string
    is_active?: boolean
  }): Promise<MasterSchedule> => {
    const response = await apiClient.put(`/master/schedule/${scheduleId}`, data)
    return response.data
  },

  deleteSchedule: async (scheduleId: number): Promise<void> => {
    await apiClient.delete(`/master/schedule/${scheduleId}`)
  },

  // Day offs management
  getDayOffs: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<MasterDayOff[]> => {
    const response = await apiClient.get('/master/day-offs', { params })
    return response.data
  },

  createDayOff: async (data: {
    date: string
    reason?: string
  }): Promise<MasterDayOff> => {
    const response = await apiClient.post('/master/day-offs', data)
    return response.data
  },

  deleteDayOff: async (dayOffId: number): Promise<void> => {
    await apiClient.delete(`/master/day-offs/${dayOffId}`)
  },
}
