import { apiClient } from './client'
import { Master } from './types'

export const mastersApi = {
  getMasters: async (params?: {
    salon_id?: number
    skip?: number
    limit?: number
  }): Promise<Master[]> => {
    const response = await apiClient.get('/masters', { params })
    return response.data
  },

  getMaster: async (id: number): Promise<Master> => {
    const response = await apiClient.get(`/masters/${id}`)
    return response.data
  },

  createMaster: async (data: {
    salon_id: number
    name: string
    phone?: string
    description?: string
    specialization?: string
    experience_years: number
  }): Promise<Master> => {
    const response = await apiClient.post('/masters', data)
    return response.data
  },

  updateMaster: async (id: number, data: Partial<Master>): Promise<Master> => {
    const response = await apiClient.patch(`/masters/${id}`, data)
    return response.data
  },

  deleteMaster: async (id: number): Promise<void> => {
    await apiClient.delete(`/masters/${id}`)
  },
}
