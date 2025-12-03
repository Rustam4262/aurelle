import { apiClient } from './client'
import { Salon } from './types'

export const favoritesApi = {
  addToFavorites: async (salonId: number): Promise<void> => {
    await apiClient.post('/favorites/', { salon_id: salonId })
  },

  removeFromFavorites: async (salonId: number): Promise<void> => {
    await apiClient.delete(`/favorites/${salonId}`)
  },

  getFavorites: async (): Promise<Salon[]> => {
    const response = await apiClient.get('/favorites/')
    return response.data
  },

  checkFavorite: async (salonId: number): Promise<boolean> => {
    const response = await apiClient.get(`/favorites/check/${salonId}`)
    return response.data.is_favorite
  }
}
