// Redis caching with graceful degradation
import type { RedisClientType } from "redis";
import { logger } from "./lib/logger";

let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;

// Initialize Redis client
export async function initRedis() {
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.info("⚠️ Redis not configured - caching disabled", { source: "redis" });
      logger.info("Set REDIS_URL environment variable to enable caching", { source: "redis" });
      return;
    }

    const { createClient } = await import("redis");
    redisClient = createClient({ url: redisUrl });

    redisClient.on("error", (err) => {
      logger.error("Redis error", err, { source: "redis" });
      isRedisAvailable = false;
    });

    redisClient.on("connect", () => {
      logger.info("✅ Redis connected successfully", { source: "redis" });
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;
  } catch (error) {
    logger.error("Redis failed to initialize", error, { source: "redis" });
    logger.info("Continuing without caching", { source: "redis" });
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
    logger.error(`Redis get error for key ${key}`, error, { source: "redis" });
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
    logger.error(`Redis set error for key ${key}`, error, { source: "redis" });
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
    logger.error(`Redis delete error for key ${key}`, error, { source: "redis" });
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
    logger.error(`Redis clear pattern error for ${pattern}`, error, { source: "redis" });
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
        setCache(cacheKey, body, ttl).catch((err) => logger.error("Redis cache set error", err, { source: "redis" }));
        return originalSend(body);
      };

      next();
    } catch (error) {
      logger.error("Redis middleware error", error, { source: "redis" });
      next();
    }
  };
}
