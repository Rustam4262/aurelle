/**
 * Chat WebSocket Service
 * Handles real-time chat messaging
 */

import { WebSocketService } from './WebSocketService';

export interface ChatMessage {
  id: number;
  salon_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface TypingIndicator {
  user_id: number;
  user_name: string;
  salon_id: number;
  is_typing: boolean;
}

export interface ReadReceipt {
  message_id: number;
  user_id: number;
}

export class ChatWebSocket extends WebSocketService {
  private static instance: ChatWebSocket | null = null;

  private constructor(token: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const url = `${protocol}//${host}/api/ws/chat?token=${token}`;

    super({
      url,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(token: string): ChatWebSocket {
    if (!ChatWebSocket.instance) {
      ChatWebSocket.instance = new ChatWebSocket(token);
    }
    return ChatWebSocket.instance;
  }

  /**
   * Destroy singleton instance
   */
  static destroyInstance(): void {
    if (ChatWebSocket.instance) {
      ChatWebSocket.instance.disconnect();
      ChatWebSocket.instance = null;
    }
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    return this.on('message', callback);
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(callback: (data: TypingIndicator) => void): () => void {
    return this.on('typing', callback);
  }

  /**
   * Subscribe to read receipts
   */
  onRead(callback: (data: ReadReceipt) => void): () => void {
    return this.on('read', callback);
  }

  /**
   * Send a chat message
   */
  sendMessage(salonId: number, message: string): void {
    this.send('message', {
      salon_id: salonId,
      message: message,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(salonId: number, isTyping: boolean): void {
    this.send('typing', {
      salon_id: salonId,
      is_typing: isTyping,
    });
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: number): void {
    this.send('read', {
      message_id: messageId,
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(salonId: number): void {
    this.send('join', {
      salon_id: salonId,
    });
  }

  /**
   * Leave a chat room
   */
  leaveRoom(salonId: number): void {
    this.send('leave', {
      salon_id: salonId,
    });
  }

  /**
   * Subscribe to connection events
   */
  onConnected(callback: () => void): () => void {
    return this.on('connected', callback);
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnected(callback: (data: { code: number; reason: string }) => void): () => void {
    return this.on('disconnected', callback);
  }

  /**
   * Subscribe to reconnection events
   */
  onReconnecting(callback: (data: { attempt: number }) => void): () => void {
    return this.on('reconnecting', callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: Event) => void): () => void {
    return this.on('error', callback);
  }
}

export default ChatWebSocket;
