import { apiClient } from './client'
import { Salon } from './types'

export const salonsApi = {
  getSalons: async (params?: {
    skip?: number
    limit?: number
    latitude?: number
    longitude?: number
    radius_km?: number
    min_rating?: number
    search?: string
  }): Promise<Salon[]> => {
    const response = await apiClient.get('/salons', { params })
    return response.data
  },

  getSalon: async (id: number): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${id}`)
    return response.data
  },

  createSalon: async (data: {
    name: string
    description?: string
    address: string
    phone: string
    latitude?: number
    longitude?: number
  }): Promise<Salon> => {
    const response = await apiClient.post('/salons', data)
    return response.data
  },

  updateSalon: async (id: number, data: Partial<Salon>): Promise<Salon> => {
    const response = await apiClient.patch(`/salons/${id}`, data)
    return response.data
  },
}
