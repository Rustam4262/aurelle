import { apiClient } from './client'

export interface SalonStatistics {
  salon_id: number
  salon_name: string
  salon_rating: number
  total: {
    bookings: number
    services: number
    masters: number
    reviews: number
  }
  bookings: {
    today: number
    week: number
    month: number
    by_status: {
      pending: number
      confirmed: number
      completed: number
      cancelled: number
    }
  }
  revenue: {
    total: number
    month: number
  }
  top_masters: Array<{
    master_id: number
    master_name: string
    booking_count: number
  }>
  top_services: Array<{
    service_id: number
    service_name: string
    booking_count: number
  }>
}

export const statisticsApi = {
  getSalonStatistics: async (salonId: number): Promise<SalonStatistics> => {
    const response = await apiClient.get(`/statistics/salon/${salonId}`)
    return response.data
  }
}
