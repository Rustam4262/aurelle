import { apiClient } from './client'
import { Booking } from './types'

export const bookingsApi = {
  getBookings: async (params?: {
    skip?: number
    limit?: number
    status_filter?: string
  }): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings', { params })
    return response.data
  },

  getBooking: async (id: number): Promise<Booking> => {
    const response = await apiClient.get(`/bookings/${id}`)
    return response.data
  },

  createBooking: async (data: {
    service_id: number
    master_id: number
    start_at: string
    client_notes?: string
  }): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data)
    return response.data
  },

  updateBooking: async (id: number, data: {
    status?: string
    salon_notes?: string
  }): Promise<Booking> => {
    const response = await apiClient.patch(`/bookings/${id}`, data)
    return response.data
  },

  cancelBooking: async (id: number): Promise<void> => {
    await apiClient.delete(`/bookings/${id}`)
  },
}
