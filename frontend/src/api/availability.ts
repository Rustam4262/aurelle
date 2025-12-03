import { apiClient } from './client'

export interface TimeSlot {
  time: string  // HH:MM
  available: boolean
  booking_id?: number
}

export interface AvailabilityResponse {
  date: string
  master_id: number
  service_duration: number
  slots: TimeSlot[]
}

export const availabilityApi = {
  getAvailableSlots: async (params: {
    master_id: number
    date: string  // YYYY-MM-DD
    service_duration: number
  }): Promise<AvailabilityResponse> => {
    const response = await apiClient.get('/availability/available-slots', { params })
    return response.data
  }
}
