import { apiClient } from './client'
import { Salon } from './types'

export interface PlatformStats {
  totals: {
    salons: number
    users: number
    bookings: number
    masters: number
    services: number
  }
  active: {
    salons: number
  }
  new_this_week: {
    salons: number
    users: number
    bookings: number
  }
  revenue: {
    total: number
  }
  ratings: {
    average: number
  }
}

export interface AdminUser {
  id: number
  name: string
  phone: string
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

export const adminApi = {
  // Статистика платформы
  getPlatformStats: async (): Promise<PlatformStats> => {
    const response = await apiClient.get('/admin/stats/platform')
    return response.data
  },

  // Салоны
  getAllSalons: async (params?: {
    skip?: number
    limit?: number
    search?: string
    is_active?: boolean
  }): Promise<Salon[]> => {
    const response = await apiClient.get('/admin/salons', { params })
    return response.data
  },

  toggleSalonActive: async (salonId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/salons/${salonId}/toggle-active`)
    return response.data
  },

  deleteSalon: async (salonId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/admin/salons/${salonId}`)
    return response.data
  },

  // Пользователи
  getAllUsers: async (params?: {
    role?: string
    skip?: number
    limit?: number
  }): Promise<AdminUser[]> => {
    const response = await apiClient.get('/admin/users', { params })
    return response.data
  },

  toggleUserActive: async (userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/users/${userId}/toggle-active`)
    return response.data
  },

  // Бронирования
  getAllBookings: async (params?: {
    status_filter?: string
    skip?: number
    limit?: number
  }) => {
    const response = await apiClient.get('/admin/bookings', { params })
    return response.data
  },
}

export interface AdminBooking {
  id: number
  client_id: number
  salon_id: number
  master_id: number
  service_id: number
  start_at: string
  end_at: string
  status: string
  price: number
  created_at: string
}
