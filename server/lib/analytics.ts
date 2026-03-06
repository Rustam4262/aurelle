/**
 * Product analytics event tracking.
 *
 * Design goals:
 *  - Non-blocking: trackEvent() returns immediately, DB writes happen in background
 *  - Never throws: any error is logged and silently dropped
 *  - Anti-spam: per-user rate limiting + configurable sampling for high-frequency events
 *  - Batch writes: events are flushed in batches every 2s to reduce DB round-trips
 *
 * In PM2 cluster mode each worker has its own queue and rate-limit map.
 * This is intentional — per-worker limits are best-effort anti-spam, not hard caps.
 */

import type { Request } from "express";
import { db } from "../db";
import { productEvents } from "@shared/schema";
import { logger } from "./logger";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface TrackEventOptions {
  /** Snake-case event name, e.g. "registration_complete" */
  eventName: string;
  /** Authenticated user's ID (omit for anonymous events) */
  userId?: string | null;
  /** Express request — used to extract IP, User-Agent, and session ID */
  req?: Request;
  /** Free-form event properties (serialised to JSONB) */
  properties?: Record<string, unknown>;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/** Max events per user per event name within the rolling window */
const RL_MAX: Record<string, number> = {
  search_performed: 20,
  booking_started: 10,
  booking_completed: 10,
  registration_complete: 3,
};
const RL_DEFAULT_MAX = 30;
const RL_WINDOW_MS = 60_000; // 1 minute

// key: "<userId>:<eventName>" → timestamps[] within the current window
const rlMap = new Map<string, number[]>();

/** Evict entries whose entire timestamp window is in the past to prevent unbounded growth. */
function pruneRlMap(): void {
  if (rlMap.size < 10_000) return;
  const cutoff = Date.now() - RL_WINDOW_MS;
  rlMap.forEach((ts, key) => {
    if (ts.every((t: number) => t < cutoff)) rlMap.delete(key);
  });
}

function isRateLimited(userId: string | null | undefined, eventName: string): boolean {
  if (!userId) return false; // anonymous events: no per-user rate limit

  const key = `${userId}:${eventName}`;
  const now = Date.now();
  const recent = (rlMap.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  const max = RL_MAX[eventName] ?? RL_DEFAULT_MAX;

  if (recent.length >= max) return true;

  recent.push(now);
  rlMap.set(key, recent);
  pruneRlMap();
  return false;
}

// ─── Sampling ─────────────────────────────────────────────────────────────────

/**
 * Sampling rates per event type (1.0 = record all).
 * High-frequency events are downsampled to reduce storage without losing signal.
 */
const SAMPLING: Record<string, number> = {
  search_performed: 0.25, // record 1 in 4 searches
};

function isSampled(eventName: string): boolean {
  const rate = SAMPLING[eventName] ?? 1.0;
  return Math.random() <= rate;
}

// ─── Write queue ──────────────────────────────────────────────────────────────

interface QueuedEvent {
  eventName: string;
  userId: string | null;
  sessionId: string | null;
  properties: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
}

const QUEUE_MAX = 500;
const FLUSH_INTERVAL_MS = 2_000;
const FLUSH_BATCH_SIZE = 100;

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (!flushTimer) {
    flushTimer = setTimeout(doFlush, FLUSH_INTERVAL_MS);
  }
}

async function doFlush(): Promise<void> {
  flushTimer = null;
  if (queue.length === 0) return;

  const batch = queue.splice(0, FLUSH_BATCH_SIZE);

  try {
    await db.insert(productEvents).values(batch);
  } catch (err) {
    logger.warn("product_events flush failed — events dropped", {
      source: "analytics",
      meta: { count: batch.length, error: String(err) },
    });
    // Fire-and-forget: do not re-queue — prefer app stability over event completeness
  }

  // More events arrived during flush — reschedule
  if (queue.length > 0) scheduleFlush();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Track a product analytics event.
 *
 * Non-blocking — returns before any DB I/O occurs. Safe to call from any
 * request handler without affecting response time.
 *
 * ```ts
 * trackEvent({ eventName: "booking_started", userId, req, properties: { salonId } });
 * ```
 */
export function trackEvent(options: TrackEventOptions): void {
  setImmediate(() => {
    try {
      const { eventName, userId = null, req, properties = {} } = options;

      if (!isSampled(eventName)) return;
      if (isRateLimited(userId, eventName)) return;

      // Extract metadata from req upfront — never keep Request objects in memory
      const sessionId: string | null = req ? ((req.session as any)?.id ?? null) : null;
      const ipAddress: string | null = req
        ? (req.ip ?? req.socket?.remoteAddress ?? null)
        : null;
      const userAgent: string | null = req
        ? (String(req.headers["user-agent"] ?? "") || null)
        : null;

      if (queue.length >= QUEUE_MAX) {
        queue.shift(); // drop oldest to make room for new event
      }

      queue.push({ eventName, userId, sessionId, properties, ipAddress, userAgent });
      scheduleFlush();
    } catch {
      // Never let analytics crash the application
    }
  });
}
