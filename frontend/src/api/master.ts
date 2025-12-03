import { apiClient } from './client'
import { BookingStatus } from './types'

export interface MasterInfo {
  id: number
  name: string
  phone: string
  description: string
  specialization: string
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
  services: Array<{
    id: number
    title: string
    price: number
    duration_minutes: number
    category: string
  }>
}

export interface MasterBooking {
  id: number
  client_id: number
  salon_id: number
  master_id: number
  service_id: number
  start_at: string
  end_at: string
  status: BookingStatus
  price: number
  payment_status: string
  payment_method?: string
  client_notes?: string
  salon_notes?: string
  created_at: string
  updated_at?: string
  service?: {
    id: number
    title: string
    duration_minutes: number
    category: string
  }
  master?: {
    id: number
    name: string
    specialization: string
    avatar_url?: string
  }
  salon?: {
    id: number
    name: string
    address: string
    phone: string
  }
}

export interface CalendarEvent {
  id: number
  start_at: string
  end_at: string
  status: string
  service_title: string
  client_id: number
  client_notes?: string
  price: number
}

export interface MasterSchedule {
  day_of_week: string
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
}

export interface DayOff {
  date: string
  reason?: string
}

export interface CalendarData {
  bookings: CalendarEvent[]
  schedules: MasterSchedule[]
  day_offs: DayOff[]
}

export interface MasterScheduleItem {
  id: number
  master_id: number
  day_of_week: string
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
  is_active: boolean
}

export interface MasterDayOff {
  id: number
  master_id: number
  date: string
  reason?: string
}

export interface MasterScheduleCreate {
  day_of_week: string
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
  is_active?: boolean
}

export interface MasterScheduleUpdate {
  start_time?: string
  end_time?: string
  break_start?: string
  break_end?: string
  is_active?: boolean
}

export interface MasterDayOffCreate {
  date: string
  reason?: string
}

export const masterApi = {
  // Информация о мастере
  getMyInfo: async (): Promise<MasterInfo> => {
    const response = await apiClient.get('/master/me')
    return response.data
  },

  // Бронирования
  getMyBookings: async (params?: {
    date_from?: string
    date_to?: string
    status_filter?: BookingStatus
    skip?: number
    limit?: number
  }): Promise<MasterBooking[]> => {
    const response = await apiClient.get('/master/bookings', { params })
    return response.data
  },

  // Календарь
  getCalendar: async (date_from: string, date_to: string): Promise<CalendarData> => {
    const response = await apiClient.get('/master/calendar', {
      params: { date_from, date_to }
    })
    return response.data
  },

  // Расписание
  getSchedule: async (): Promise<MasterScheduleItem[]> => {
    const response = await apiClient.get('/master/schedule')
    return response.data
  },

  createSchedule: async (data: MasterScheduleCreate): Promise<MasterScheduleItem> => {
    const response = await apiClient.post('/master/schedule', data)
    return response.data
  },

  updateSchedule: async (scheduleId: number, data: MasterScheduleUpdate): Promise<MasterScheduleItem> => {
    const response = await apiClient.put(`/master/schedule/${scheduleId}`, data)
    return response.data
  },

  deleteSchedule: async (scheduleId: number): Promise<void> => {
    await apiClient.delete(`/master/schedule/${scheduleId}`)
  },

  // Выходные дни
  getDayOffs: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<MasterDayOff[]> => {
    const response = await apiClient.get('/master/day-offs', { params })
    return response.data
  },

  createDayOff: async (data: MasterDayOffCreate): Promise<MasterDayOff> => {
    const response = await apiClient.post('/master/day-offs', data)
    return response.data
  },

  deleteDayOff: async (dayOffId: number): Promise<void> => {
    await apiClient.delete(`/master/day-offs/${dayOffId}`)
  },
}
