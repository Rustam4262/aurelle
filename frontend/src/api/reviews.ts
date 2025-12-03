import { apiClient } from './client'

export interface Review {
  id: number
  booking_id: number
  client_id: number
  salon_id: number
  master_id: number
  rating: number
  comment?: string
  created_at: string
}

export interface DetailedReview extends Review {
  client?: {
    id: number
    name: string
    email: string
  }
}

export interface ReviewCreate {
  booking_id: number
  rating: number
  comment?: string
}

export const reviewsApi = {
  getReviews: async (params?: {
    salon_id?: number
    master_id?: number
    skip?: number
    limit?: number
  }): Promise<Review[]> => {
    const response = await apiClient.get('/reviews/', { params })
    return response.data
  },

  getReviewsDetailed: async (params?: {
    salon_id?: number
    master_id?: number
    skip?: number
    limit?: number
  }): Promise<DetailedReview[]> => {
    const response = await apiClient.get('/reviews/detailed/all', { params })
    return response.data
  },

  getReview: async (id: number): Promise<Review> => {
    const response = await apiClient.get(`/reviews/${id}`)
    return response.data
  },

  createReview: async (data: ReviewCreate): Promise<Review> => {
    const response = await apiClient.post('/reviews/', data)
    return response.data
  }
}
