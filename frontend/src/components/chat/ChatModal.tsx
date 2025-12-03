import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { chatApi, ChatMessage, ChatMessageCreate } from '../../api/chat'
import { useAuthStore } from '../../store/authStore'

interface Props {
  receiverId: number
  receiverName: string
  salonId?: number
  salonName?: string
  onClose: () => void
}

export default function ChatModal({ receiverId, receiverName, salonId, salonName, onClose }: Props) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<number>()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const data = await chatApi.getMessages(receiverId, salonId)
      setMessages(data)
      scrollToBottom()
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()

    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      loadMessages()
    }, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [receiverId, salonId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || sending) return

    try {
      setSending(true)

      const messageData: ChatMessageCreate = {
        receiver_id: receiverId,
        salon_id: salonId,
        message: newMessage.trim(),
      }

      const sentMessage = await chatApi.sendMessage(messageData)
      setMessages([...messages, sentMessage])
      setNewMessage('')
      scrollToBottom()
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">{receiverName}</h2>
            </div>
            {salonName && <p className="text-pink-100 text-sm mt-1">{salonName}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-pink-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">Начните диалог с {receiverName}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-200`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                      isOwn
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-pink-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200 rounded-b-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Отправить
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
