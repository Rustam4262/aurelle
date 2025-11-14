import { apiClient } from './client'
import { AuthResponse } from './types'

export const authApi = {
  register: async (data: {
    phone: string
    email?: string
    name: string
    password: string
    role?: 'client' | 'salon_owner'
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  login: async (data: {
    phone: string
    password: string
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },
}
