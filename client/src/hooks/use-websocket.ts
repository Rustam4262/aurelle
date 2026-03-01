import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";

type EventHandler = (data: unknown) => void;

interface WsMessage {
  event: string;
  data: unknown;
}

let globalWs: WebSocket | null = null;
let globalHandlers: Map<string, Set<EventHandler>> = new Map();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let activeUserId: string | null = null;

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

async function fetchWsToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/ws-token", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

function emit(event: string, data: unknown) {
  const handlers = globalHandlers.get(event);
  if (handlers) {
    for (const handler of Array.from(handlers)) handler(data);
  }
}

async function connect(userId: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return;
  if (globalWs && globalWs.readyState === WebSocket.CONNECTING) return;

  const token = await fetchWsToken();
  if (!token) {
    scheduleReconnect(userId);
    return;
  }

  const ws = new WebSocket(`${getWsUrl()}?token=${token}`);
  globalWs = ws;

  ws.onopen = () => {
    reconnectDelay = 1000; // reset backoff
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as WsMessage;
      emit(msg.event, msg.data);
    } catch {
      // ignore malformed
    }
  };

  ws.onclose = () => {
    globalWs = null;
    if (activeUserId === userId) {
      scheduleReconnect(userId);
    }
  };

  ws.onerror = () => {
    ws.close();
  };
}

function scheduleReconnect(userId: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    if (activeUserId === userId) connect(userId);
  }, reconnectDelay);
}

function disconnect() {
  activeUserId = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

/**
 * useWebSocket — connects to the WebSocket server and provides event subscriptions.
 *
 * Usage:
 * ```tsx
 * const { on, off } = useWebSocket();
 * useEffect(() => {
 *   const handler = (data) => console.log("new booking", data);
 *   on("new_booking", handler);
 *   return () => off("new_booking", handler);
 * }, [on, off]);
 * ```
 */
export function useWebSocket() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      disconnect();
      return;
    }
    activeUserId = userId;
    connect(userId);
    return () => {
      // Don't disconnect on unmount — keep global connection alive across components
    };
  }, [userId]);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!globalHandlers.has(event)) globalHandlers.set(event, new Set());
    globalHandlers.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: string, handler: EventHandler) => {
    globalHandlers.get(event)?.delete(handler);
  }, []);

  return { on, off };
}
