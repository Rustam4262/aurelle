/**
 * WebSocket Services Export
 */

export { WebSocketService } from './WebSocketService';
export type { WebSocketConfig, WebSocketEventCallback } from './WebSocketService';

export { NotificationWebSocket } from './NotificationWebSocket';
export type {
  Notification,
  BookingUpdate,
  NewReview,
  UnreadCount,
} from './NotificationWebSocket';

export { ChatWebSocket } from './ChatWebSocket';
export type {
  ChatMessage,
  TypingIndicator,
  ReadReceipt,
} from './ChatWebSocket';
