import { apiClient } from './client'
import { Service } from './types'

export const servicesApi = {
  getServices: async (params?: {
    salon_id?: number
    category?: string
    min_price?: number
    max_price?: number
    skip?: number
    limit?: number
  }): Promise<Service[]> => {
    const response = await apiClient.get('/services', { params })
    return response.data
  },

  getService: async (id: number): Promise<Service> => {
    const response = await apiClient.get(`/services/${id}`)
    return response.data
  },

  createService: async (data: {
    salon_id: number
    title: string
    description?: string
    price: number
    duration_minutes: number
    category?: string
  }): Promise<Service> => {
    const response = await apiClient.post('/services', data)
    return response.data
  },

  deleteService: async (id: number): Promise<void> => {
    await apiClient.delete(`/services/${id}`)
  },
}
