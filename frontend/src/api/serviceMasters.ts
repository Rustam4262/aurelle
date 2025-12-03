import { apiClient } from './client'

export interface ServiceMasterLink {
  id: number
  service_id: number
  master_id: number
}

export interface ServiceMasterCreate {
  service_id: number
  master_id: number
}

export const serviceMastersApi = {
  // Создать связь услуги и мастера
  createLink: async (data: ServiceMasterCreate): Promise<ServiceMasterLink> => {
    const response = await apiClient.post('/service-masters/', data)
    return response.data
  },

  // Удалить связь
  deleteLink: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/service-masters/${id}`)
    return response.data
  },

  // Получить список ID мастеров для услуги
  getMastersByService: async (serviceId: number): Promise<number[]> => {
    const response = await apiClient.get(`/service-masters/service/${serviceId}/masters`)
    return response.data
  },

  // Получить список ID услуг для мастера
  getServicesByMaster: async (masterId: number): Promise<number[]> => {
    const response = await apiClient.get(`/service-masters/master/${masterId}/services`)
    return response.data
  },

  // Массовое обновление мастеров для услуги
  updateServiceMasters: async (
    serviceId: number,
    masterIds: number[]
  ): Promise<{ message: string; master_ids: number[] }> => {
    const response = await apiClient.post(
      `/service-masters/service/${serviceId}/masters/bulk`,
      masterIds
    )
    return response.data
  }
}
