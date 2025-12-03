import { apiClient } from './client'

export interface ChatMessage {
  id: number
  sender_id: number
  receiver_id: number
  salon_id?: number
  message: string
  is_read: number
  created_at: string
  sender_name?: string
  receiver_name?: string
}

export interface ChatMessageCreate {
  receiver_id: number
  salon_id?: number
  message: string
}

export interface ChatConversation {
  user_id: number
  user_name: string
  salon_id?: number
  salon_name?: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export const chatApi = {
  sendMessage: async (data: ChatMessageCreate): Promise<ChatMessage> => {
    const response = await apiClient.post('/chat/messages', data)
    return response.data
  },

  getMessages: async (userId: number, salonId?: number, limit: number = 50): Promise<ChatMessage[]> => {
    const params: any = { limit }
    if (salonId) params.salon_id = salonId

    const response = await apiClient.get(`/chat/messages/${userId}`, { params })
    return response.data
  },

  getConversations: async (): Promise<ChatConversation[]> => {
    const response = await apiClient.get('/chat/conversations')
    return response.data
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/chat/unread-count')
    return response.data.unread_count
  },
}
