/**
 * useChat Hook
 * React hook for chat WebSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { ChatWebSocket, ChatMessage, TypingIndicator } from '../../services/websocket';

interface UseChatReturn {
  isConnected: boolean;
  messages: ChatMessage[];
  typingUsers: Map<number, string>;
  sendMessage: (salonId: number, message: string) => void;
  setTyping: (salonId: number, isTyping: boolean) => void;
  markAsRead: (messageId: number) => void;
  joinRoom: (salonId: number) => void;
  leaveRoom: (salonId: number) => void;
}

export function useChat(token: string | null): UseChatReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [ws, setWs] = useState<ChatWebSocket | null>(null);
  const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!token) return;

    // Initialize WebSocket
    const websocket = ChatWebSocket.getInstance(token);
    setWs(websocket);

    // Connection status handlers
    const unsubConnected = websocket.onConnected(() => {
      console.log('[Chat] Connected');
      setIsConnected(true);
    });

    const unsubDisconnected = websocket.onDisconnected(() => {
      console.log('[Chat] Disconnected');
      setIsConnected(false);
    });

    const unsubReconnecting = websocket.onReconnecting((data) => {
      console.log(`[Chat] Reconnecting... attempt ${data.attempt}`);
    });

    // Message handlers
    const unsubMessage = websocket.onMessage((message: ChatMessage) => {
      console.log('[Chat] New message:', message);
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Play notification sound
      playNotificationSound();
    });

    const unsubTyping = websocket.onTyping((data: TypingIndicator) => {
      console.log('[Chat] Typing indicator:', data);

      if (data.is_typing) {
        setTypingUsers(prev => new Map(prev).set(data.user_id, data.user_name));

        // Clear existing timeout
        const existingTimeout = typingTimeoutRef.current.get(data.user_id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove typing indicator after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.user_id);
            return newMap;
          });
          typingTimeoutRef.current.delete(data.user_id);
        }, 3000);

        typingTimeoutRef.current.set(data.user_id, timeout);
      } else {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user_id);
          return newMap;
        });

        // Clear timeout
        const existingTimeout = typingTimeoutRef.current.get(data.user_id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutRef.current.delete(data.user_id);
        }
      }
    });

    const unsubRead = websocket.onRead((data) => {
      console.log('[Chat] Message read:', data.message_id);
      setMessages(prev =>
        prev.map(m => (m.id === data.message_id ? { ...m, is_read: true } : m))
      );
    });

    // Connect
    websocket.connect();

    // Cleanup
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubReconnecting();
      unsubMessage();
      unsubTyping();
      unsubRead();

      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [token]);

  const sendMessage = useCallback((salonId: number, message: string) => {
    if (ws && message.trim()) {
      ws.sendMessage(salonId, message.trim());
    }
  }, [ws]);

  const setTyping = useCallback((salonId: number, isTyping: boolean) => {
    if (ws) {
      ws.sendTyping(salonId, isTyping);
    }
  }, [ws]);

  const markAsRead = useCallback((messageId: number) => {
    if (ws) {
      ws.markAsRead(messageId);
    }
  }, [ws]);

  const joinRoom = useCallback((salonId: number) => {
    if (ws) {
      ws.joinRoom(salonId);
      console.log(`[Chat] Joined room for salon ${salonId}`);
    }
  }, [ws]);

  const leaveRoom = useCallback((salonId: number) => {
    if (ws) {
      ws.leaveRoom(salonId);
      console.log(`[Chat] Left room for salon ${salonId}`);
    }
  }, [ws]);

  return {
    isConnected,
    messages,
    typingUsers,
    sendMessage,
    setTyping,
    markAsRead,
    joinRoom,
    leaveRoom,
  };
}

/**
 * Play notification sound
 */
function playNotificationSound(): void {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore errors (user hasn't interacted with page yet)
    });
  } catch (error) {
    console.error('[Chat] Error playing notification sound:', error);
  }
}
