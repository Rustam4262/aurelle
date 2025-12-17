/**
 * Notification WebSocket Service
 * Handles real-time notifications
 */

import { WebSocketService } from './WebSocketService';

export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  booking_id?: number;
  created_at: string;
  is_read: boolean;
}

export interface BookingUpdate {
  booking_id: number;
  status: string;
  updated_at: string;
}

export interface NewReview {
  review_id: number;
  salon_id: number;
  rating: number;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

export class NotificationWebSocket extends WebSocketService {
  private static instance: NotificationWebSocket | null = null;

  private constructor(token: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const url = `${protocol}//${host}/api/ws/notifications?token=${token}`;

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
  static getInstance(token: string): NotificationWebSocket {
    if (!NotificationWebSocket.instance) {
      NotificationWebSocket.instance = new NotificationWebSocket(token);
    }
    return NotificationWebSocket.instance;
  }

  /**
   * Destroy singleton instance
   */
  static destroyInstance(): void {
    if (NotificationWebSocket.instance) {
      NotificationWebSocket.instance.disconnect();
      NotificationWebSocket.instance = null;
    }
  }

  /**
   * Subscribe to new notifications
   */
  onNotification(callback: (notification: Notification) => void): () => void {
    return this.on('notification', callback);
  }

  /**
   * Subscribe to booking updates
   */
  onBookingUpdate(callback: (update: BookingUpdate) => void): () => void {
    return this.on('booking_update', callback);
  }

  /**
   * Subscribe to new reviews
   */
  onNewReview(callback: (review: NewReview) => void): () => void {
    return this.on('new_review', callback);
  }

  /**
   * Subscribe to unread count updates
   */
  onUnreadCount(callback: (data: UnreadCount) => void): () => void {
    return this.on('unread_count', callback);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): void {
    this.send('mark_read', { notification_id: notificationId });
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
}

export default NotificationWebSocket;
