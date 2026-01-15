import { cacheHelpers, CacheKey, CacheTTL } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Cache service for application-specific caching logic
 */
export class CacheService {
  /**
   * Get salons by city (with caching)
   */
  static async getSalonsByCity(city: string, fetchFunction: () => Promise<any[]>) {
    const cacheKey = CacheKey.SALONS_BY_CITY(city);

    try {
      // Try to get from cache
      const cached = await cacheHelpers.get<any[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT: Salons for city ${city}`);
        return cached;
      }

      logger.debug(`Cache MISS: Salons for city ${city}`);

      // Fetch from database
      const salons = await fetchFunction();

      // Cache the result
      await cacheHelpers.set(cacheKey, salons, CacheTTL.SALONS_LIST);

      return salons;
    } catch (error) {
      logger.error(`Error getting salons for city ${city}:`, error);
      // On error, try to fetch without cache
      return fetchFunction();
    }
  }

  /**
   * Get salon by ID (with caching)
   */
  static async getSalonById(id: string, fetchFunction: () => Promise<any>) {
    const cacheKey = CacheKey.SALON_BY_ID(id);

    try {
      // Try to get from cache
      const cached = await cacheHelpers.get<any>(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT: Salon ${id}`);
        return cached;
      }

      logger.debug(`Cache MISS: Salon ${id}`);

      // Fetch from database
      const salon = await fetchFunction();

      // Cache the result
      if (salon) {
        await cacheHelpers.set(cacheKey, salon, CacheTTL.SALON_DETAIL);
      }

      return salon;
    } catch (error) {
      logger.error(`Error getting salon ${id}:`, error);
      return fetchFunction();
    }
  }

  /**
   * Invalidate salon cache
   */
  static async invalidateSalon(salonId: string) {
    try {
      // Delete salon detail cache
      await cacheHelpers.del(CacheKey.SALON_BY_ID(salonId));

      // Delete all city-based salon lists (they include this salon)
      await cacheHelpers.delPattern('salons:city:*');

      // Delete salon's services and specialists
      await cacheHelpers.del([
        CacheKey.SERVICES_BY_SALON(salonId),
        CacheKey.SPECIALISTS_BY_SALON(salonId),
      ]);

      // Delete search results
      await cacheHelpers.delPattern('search:*');

      logger.debug(`Cache invalidated for salon ${salonId}`);
    } catch (error) {
      logger.error(`Error invalidating cache for salon ${salonId}:`, error);
    }
  }

  /**
   * Invalidate all salon caches
   */
  static async invalidateAllSalons() {
    try {
      await cacheHelpers.delPattern('salons:*');
      await cacheHelpers.delPattern('salon:*');
      await cacheHelpers.delPattern('services:*');
      await cacheHelpers.delPattern('specialists:*');
      await cacheHelpers.delPattern('search:*');

      logger.debug('All salon caches invalidated');
    } catch (error) {
      logger.error('Error invalidating all salon caches:', error);
    }
  }

  /**
   * Get user profile (with caching)
   */
  static async getUserProfile(userId: string, fetchFunction: () => Promise<any>) {
    const cacheKey = CacheKey.USER_PROFILE(userId);

    try {
      const cached = await cacheHelpers.get<any>(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT: User ${userId}`);
        return cached;
      }

      logger.debug(`Cache MISS: User ${userId}`);

      const user = await fetchFunction();

      if (user) {
        await cacheHelpers.set(cacheKey, user, CacheTTL.USER_PROFILE);
      }

      return user;
    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error);
      return fetchFunction();
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId: string) {
    try {
      await cacheHelpers.del(CacheKey.USER_PROFILE(userId));
      logger.debug(`Cache invalidated for user ${userId}`);
    } catch (error) {
      logger.error(`Error invalidating cache for user ${userId}:`, error);
    }
  }

  /**
   * Cache search results
   */
  static async cacheSearch(query: string, filters: any, results: any[]) {
    try {
      const filtersStr = JSON.stringify(filters);
      const cacheKey = CacheKey.SEARCH(query, filtersStr);

      await cacheHelpers.set(cacheKey, results, CacheTTL.SEARCH_RESULTS);
      logger.debug(`Cached search results for: ${query}`);
    } catch (error) {
      logger.error('Error caching search results:', error);
    }
  }

  /**
   * Get cached search results
   */
  static async getCachedSearch(query: string, filters: any): Promise<any[] | null> {
    try {
      const filtersStr = JSON.stringify(filters);
      const cacheKey = CacheKey.SEARCH(query, filtersStr);

      const cached = await cacheHelpers.get<any[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT: Search ${query}`);
        return cached;
      }

      logger.debug(`Cache MISS: Search ${query}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached search:', error);
      return null;
    }
  }

  /**
   * Warm up cache (pre-populate common data)
   */
  static async warmUp() {
    logger.info('Warming up cache...');

    try {
      // Pre-cache common cities' salons
      const commonCities = ['Tashkent', 'Samarkand', 'Bukhara'];

      for (const city of commonCities) {
        // This would be replaced with actual database queries
        logger.debug(`Warming up cache for city: ${city}`);
        // await this.getSalonsByCity(city, () => fetchSalonsFromDb(city));
      }

      logger.info('Cache warm-up complete');
    } catch (error) {
      logger.error('Error warming up cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  static async clearAll() {
    try {
      await cacheHelpers.delPattern('*');
      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    try {
      return await cacheHelpers.getStats();
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}
