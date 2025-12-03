import apiClient from './index'

export interface DayOfWeek {
  MONDAY: 0
  TUESDAY: 1
  WEDNESDAY: 2
  THURSDAY: 3
  FRIDAY: 4
  SATURDAY: 5
  SUNDAY: 6
}

export interface MasterSchedule {
  id: number
  master_id: number
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string // "09:00"
  end_time: string // "18:00"
  break_start?: string
  break_end?: string
  is_active: boolean
}

export interface MasterScheduleCreate {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
  is_active?: boolean
}

export interface MasterDayOff {
  id: number
  master_id: number
  date: string // YYYY-MM-DD
  reason?: string
}

export interface MasterDayOffCreate {
  date: string // YYYY-MM-DD
  reason?: string
}

export interface TimeSlot {
  start_time: string // "09:00"
  end_time: string // "09:30"
  available: boolean
}

export interface AvailableSlotsResponse {
  date: string
  master_id: number
  master_name: string
  available_slots: TimeSlot[]
  reason?: string
}

export interface MasterBooking {
  id: number
  start_at: string // ISO datetime
  duration_minutes: number
  status: string
  client_name: string
  client_phone?: string
  service_title: string
  total_price: number
}

export const scheduleApi = {
  // Schedule Management
  createSchedule: async (masterId: number, data: MasterScheduleCreate): Promise<MasterSchedule> => {
    const response = await apiClient.post(`/schedule/masters/${masterId}/schedules`, data)
    return response.data
  },

  getSchedules: async (masterId: number): Promise<MasterSchedule[]> => {
    const response = await apiClient.get(`/schedule/masters/${masterId}/schedules`)
    return response.data
  },

  updateSchedule: async (scheduleId: number, data: Partial<MasterScheduleCreate>): Promise<MasterSchedule> => {
    const response = await apiClient.put(`/schedule/schedules/${scheduleId}`, data)
    return response.data
  },

  deleteSchedule: async (scheduleId: number): Promise<void> => {
    await apiClient.delete(`/schedule/schedules/${scheduleId}`)
  },

  // Day Off Management
  createDayOff: async (masterId: number, data: MasterDayOffCreate): Promise<MasterDayOff> => {
    const response = await apiClient.post(`/schedule/masters/${masterId}/day-offs`, data)
    return response.data
  },

  getDayOffs: async (masterId: number, fromDate?: string, toDate?: string): Promise<MasterDayOff[]> => {
    const params: any = {}
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    const response = await apiClient.get(`/schedule/masters/${masterId}/day-offs`, { params })
    return response.data
  },

  deleteDayOff: async (dayOffId: number): Promise<void> => {
    await apiClient.delete(`/schedule/day-offs/${dayOffId}`)
  },

  // Available Slots
  getAvailableSlots: async (
    masterId: number,
    date: string, // YYYY-MM-DD
    serviceId: number
  ): Promise<AvailableSlotsResponse> => {
    const response = await apiClient.get(`/schedule/masters/${masterId}/available-slots`, {
      params: { date_str: date, service_id: serviceId }
    })
    return response.data
  },

  // Master Bookings
  getMasterBookings: async (
    masterId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<MasterBooking[]> => {
    const params: any = {}
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    const response = await apiClient.get(`/schedule/masters/${masterId}/bookings`, { params })
    return response.data
  }
}
