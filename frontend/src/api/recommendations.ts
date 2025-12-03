import { apiClient } from './client'
import { Salon } from './types'

export const recommendationsApi = {
  getPersonalized: async (limit: number = 10): Promise<Salon[]> => {
    const response = await apiClient.get('/recommendations/personalized', {
      params: { limit },
    })
    return response.data
  },

  getPopular: async (limit: number = 10): Promise<Salon[]> => {
    const response = await apiClient.get('/recommendations/popular', {
      params: { limit },
    })
    return response.data
  },

  getNearby: async (
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 10
  ): Promise<Salon[]> => {
    const response = await apiClient.get('/recommendations/nearby', {
      params: {
        latitude,
        longitude,
        radius_km: radiusKm,
        limit,
      },
    })
    return response.data
  },
}
