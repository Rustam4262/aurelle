import { Request, Response, NextFunction } from 'express';
import { cacheHelpers } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Cache middleware - caches GET requests
 */
export const cacheMiddleware = (ttl: number, keyGenerator?: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}`;

      // Try to get cached response
      const cachedData = await cacheHelpers.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      logger.debug(`Cache MISS: ${cacheKey}`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data: any) {
        // Cache the response
        cacheHelpers.set(cacheKey, data, ttl).catch((err) => {
          logger.error(`Failed to cache response for ${cacheKey}:`, err);
        });

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // On error, skip caching
      next();
    }
  };
};

/**
 * Cache invalidation middleware - invalidates cache on mutations
 */
export const invalidateCacheMiddleware = (
  patterns: string[] | ((req: Request) => string[])
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to invalidate cache after successful response
    res.json = function (data: any) {
      // Only invalidate on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsToInvalidate =
          typeof patterns === 'function' ? patterns(req) : patterns;

        // Invalidate cache asynchronously (don't block response)
        Promise.all(
          patternsToInvalidate.map((pattern) => cacheHelpers.delPattern(pattern))
        )
          .then((results) => {
            const totalDeleted = results.reduce((sum, count) => sum + count, 0);
            if (totalDeleted > 0) {
              logger.debug(`Cache invalidated: ${totalDeleted} keys deleted`);
            }
          })
          .catch((err) => {
            logger.error('Cache invalidation error:', err);
          });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Rate limiting middleware using Redis
 */
export const rateLimitMiddleware = (
  maxRequests: number,
  windowSeconds: number,
  keyGenerator?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key (default: by IP)
      const identifier = keyGenerator
        ? keyGenerator(req)
        : req.ip || req.socket.remoteAddress || 'unknown';

      const key = `ratelimit:${identifier}:${req.path}`;

      // Check rate limit
      const result = await cacheHelpers.rateLimit(key, maxRequests, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again after ${new Date(result.resetAt).toISOString()}`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // On error, allow the request
      next();
    }
  };
};
