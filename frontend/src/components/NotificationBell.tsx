/**
 * NotificationBell Component
 * Displays notification icon with unread count badge
 */

import { useState, useEffect } from 'react';
import { useNotifications, requestNotificationPermission } from '../hooks/websocket';
import { useAuthStore } from '../store/authStore'

export function NotificationBell() {
  const { token } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, unreadCount, notifications, markAsRead } = useNotifications(token);

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleNotificationClick = (notificationId: number) => {
    markAsRead(notificationId);
    // Navigate to related page if needed
  };

  return (
    <div className="notification-bell-container">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-bell-button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection status indicator */}
        {!isConnected && (
          <span className="connection-status offline" title="Reconnecting...">
            ●
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Уведомления</h3>
            {unreadCount > 0 && (
              <span className="unread-count">{unreadCount} новых</span>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>Нет уведомлений</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  {!notification.is_read && <span className="unread-dot">●</span>}
                </div>
              ))
            )}
          </div>

          <div className="notification-footer">
            <a href="/notifications">Все уведомления</a>
          </div>
        </div>
      )}

      <style>{`
        .notification-bell-container {
          position: relative;
        }

        .notification-bell-button {
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          color: #333;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .notification-bell-button:hover {
          background-color: #f0f0f0;
        }

        .notification-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ff4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: bold;
          min-width: 18px;
          text-align: center;
        }

        .connection-status {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 8px;
        }

        .connection-status.offline {
          color: #ff9800;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          max-height: 480px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          overflow: hidden;
          z-index: 1000;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #eee;
        }

        .notification-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .unread-count {
          font-size: 12px;
          color: #666;
        }

        .notification-list {
          max-height: 360px;
          overflow-y: auto;
        }

        .no-notifications {
          padding: 40px 20px;
          text-align: center;
          color: #999;
        }

        .notification-item {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          gap: 12px;
        }

        .notification-item:hover {
          background-color: #f8f8f8;
        }

        .notification-item.unread {
          background-color: #f0f7ff;
        }

        .notification-content {
          flex: 1;
        }

        .notification-content h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .notification-content p {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #666;
        }

        .notification-time {
          font-size: 11px;
          color: #999;
        }

        .unread-dot {
          color: #667eea;
          font-size: 20px;
          line-height: 1;
        }

        .notification-footer {
          padding: 12px 16px;
          border-top: 1px solid #eee;
          text-align: center;
        }

        .notification-footer a {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }

        .notification-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
