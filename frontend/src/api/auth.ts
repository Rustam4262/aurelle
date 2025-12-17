import { apiClient } from './client'
import { AuthResponse } from './types'

export const authApi = {
  register: async (data: {
    phone: string
    email?: string
    name: string
    password: string
    role?: 'admin' | 'salon_owner' | 'master' | 'client'
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  login: async (data: {
    phone?: string
    email?: string
    password: string
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  changePassword: async (data: {
    current_password: string
    new_password: string
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', data)
    return response.data
  },
}
