import { apiClient } from './client'

export const uploadsApi = {
  uploadSalonLogo: async (salonId: number, file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/uploads/salon-logo/${salonId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadSalonFacade: async (salonId: number, file: File): Promise<{ external_photo_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/uploads/salon-facade/${salonId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadMasterAvatar: async (masterId: number, file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/uploads/master-avatar/${masterId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data.url || response.data.file_url
  },
}
