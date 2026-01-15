import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY error
      return true;
    }
    return false;
  },
};

// Create Redis client
export const redisClient = new Redis(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('Redis: Connected');
});

redisClient.on('ready', () => {
  logger.info('Redis: Ready to accept commands');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis: Connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis: Reconnecting...');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit();
  logger.info('Redis: Connection closed gracefully');
});

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SALONS_LIST: 600, // 10 minutes
  SALON_DETAIL: 300, // 5 minutes
  SERVICES_LIST: 3600, // 1 hour
  SPECIALISTS_LIST: 1800, // 30 minutes
  USER_PROFILE: 900, // 15 minutes
  SEARCH_RESULTS: 600, // 10 minutes
} as const;

// Cache key prefixes
export const CacheKey = {
  SALONS_BY_CITY: (city: string) => `salons:city:${city}`,
  SALON_BY_ID: (id: string) => `salon:${id}`,
  SERVICES_BY_SALON: (salonId: string) => `services:salon:${salonId}`,
  SPECIALISTS_BY_SALON: (salonId: string) => `specialists:salon:${salonId}`,
  USER_PROFILE: (userId: string) => `user:${userId}`,
  SEARCH: (query: string, filters: string) => `search:${query}:${filters}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
} as const;

// Helper functions
export const cacheHelpers = {
  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached data with TTL
   */
  async set(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete cached data
   */
  async del(key: string | string[]): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis del error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      await redisClient.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error(`Redis delPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Rate limiting: increment counter
   */
  async rateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      const ttl = await redisClient.ttl(key);
      const resetAt = Date.now() + ttl * 1000;

      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetAt,
      };
    } catch (error) {
      logger.error(`Redis rateLimit error for key ${key}:`, error);
      // On error, allow the request
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
    }
  },

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await redisClient.info('stats');
      const memory = await redisClient.info('memory');

      return {
        info,
        memory,
      };
    } catch (error) {
      logger.error('Redis getStats error:', error);
      return null;
    }
  },
};

export default redisClient;
