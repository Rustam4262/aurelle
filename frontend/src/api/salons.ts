import { apiClient } from './client'
import { Salon } from './types'

export interface SalonMapData {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  rating: number
  reviews_count: number
  external_photo_url?: string
  logo_url?: string
}

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

  getSalonsForMap: async (search?: string): Promise<SalonMapData[]> => {
    const response = await apiClient.get('/salons/for-map', { params: { search } })
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

  getMySalons: async (): Promise<Salon[]> => {
    const response = await apiClient.get('/salons/my/salons')
    return response.data
  },
}
