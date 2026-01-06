// Redis caching with graceful degradation
import type { RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;

// Initialize Redis client
export async function initRedis() {
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log("[REDIS] ⚠️ Redis not configured - caching disabled");
      console.log("[REDIS] Set REDIS_URL environment variable to enable caching");
      return;
    }

    const { createClient } = await import('redis');
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('[REDIS] Error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[REDIS] ✅ Connected successfully');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;
  } catch (error) {
    console.error('[REDIS] Failed to initialize:', error);
    console.log('[REDIS] Continuing without caching');
    redisClient = null;
    isRedisAvailable = false;
  }
}

// Get from cache
export async function getCache(key: string): Promise<any | null> {
  if (!isRedisAvailable || !redisClient) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`[REDIS] Get error for key ${key}:`, error);
    return null;
  }
}

// Set cache
export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`[REDIS] Set error for key ${key}:`, error);
  }
}

// Delete from cache
export async function delCache(key: string): Promise<void> {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`[REDIS] Delete error for key ${key}:`, error);
  }
}

// Clear cache by pattern
export async function clearCachePattern(pattern: string): Promise<void> {
  if (!isRedisAvailable || !redisClient) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`[REDIS] Clear pattern error for ${pattern}:`, error);
  }
}

// Cache middleware
export function cacheMiddleware(keyPrefix: string, ttl: number = 300) {
  return async (req: any, res: any, next: any) => {
    if (!isRedisAvailable) {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original send function
      const originalSend = res.json.bind(res);

      // Override json function to cache response
      res.json = function (body: any) {
        setCache(cacheKey, body, ttl).catch(console.error);
        return originalSend(body);
      };

      next();
    } catch (error) {
      console.error('[REDIS] Middleware error:', error);
      next();
    }
  };
}
