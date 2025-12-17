/**
 * useNotifications Hook
 * React hook for notification WebSocket
 */

import { useEffect, useState, useCallback } from 'react';
import { NotificationWebSocket, Notification, BookingUpdate, NewReview } from '../../services/websocket';

interface UseNotificationsReturn {
  isConnected: boolean;
  unreadCount: number;
  notifications: Notification[];
  markAsRead: (notificationId: number) => void;
  onBookingUpdate: (callback: (update: BookingUpdate) => void) => void;
  onNewReview: (callback: (review: NewReview) => void) => void;
}

export function useNotifications(token: string | null): UseNotificationsReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ws, setWs] = useState<NotificationWebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Initialize WebSocket
    const websocket = NotificationWebSocket.getInstance(token);
    setWs(websocket);

    // Connection status handlers
    const unsubConnected = websocket.onConnected(() => {
      console.log('[Notifications] Connected');
      setIsConnected(true);
    });

    const unsubDisconnected = websocket.onDisconnected(() => {
      console.log('[Notifications] Disconnected');
      setIsConnected(false);
    });

    const unsubReconnecting = websocket.onReconnecting((data) => {
      console.log(`[Notifications] Reconnecting... attempt ${data.attempt}`);
    });

    // Notification handlers
    const unsubNotification = websocket.onNotification((notification: Notification) => {
      console.log('[Notifications] New notification:', notification);
      setNotifications(prev => [notification, ...prev]);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          tag: `notification-${notification.id}`,
        });
      }
    });

    const unsubUnreadCount = websocket.onUnreadCount((data) => {
      console.log('[Notifications] Unread count:', data.count);
      setUnreadCount(data.count);
    });

    // Connect
    websocket.connect();

    // Cleanup
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubReconnecting();
      unsubNotification();
      unsubUnreadCount();
    };
  }, [token]);

  const markAsRead = useCallback((notificationId: number) => {
    if (ws) {
      ws.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  }, [ws]);

  const onBookingUpdate = useCallback((callback: (update: BookingUpdate) => void) => {
    if (ws) {
      ws.onBookingUpdate(callback);
    }
  }, [ws]);

  const onNewReview = useCallback((callback: (review: NewReview) => void) => {
    if (ws) {
      ws.onNewReview(callback);
    }
  }, [ws]);

  return {
    isConnected,
    unreadCount,
    notifications,
    markAsRead,
    onBookingUpdate,
    onNewReview,
  };
}

/**
 * Request browser notification permission
 */
export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('[Notifications] Permission:', permission);
    });
  }
}
