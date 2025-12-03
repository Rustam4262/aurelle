import { apiClient } from './client'
import { User } from './types'

export interface UserUpdate {
  name?: string
  email?: string
  phone?: string
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me')
    return response.data
  },

  updateMe: async (data: UserUpdate): Promise<User> => {
    const response = await apiClient.patch('/users/me', data)
    return response.data
  },

  getUser: async (userId: number): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`)
    return response.data
  },

  // Admin endpoints
  getAllUsers: async (params?: {
    skip?: number
    limit?: number
    role?: string
  }): Promise<User[]> => {
    const response = await apiClient.get('/users/', { params })
    return response.data
  },

  toggleUserActive: async (userId: number): Promise<User> => {
    const response = await apiClient.patch(`/users/${userId}/toggle-active`)
    return response.data
  }
}
