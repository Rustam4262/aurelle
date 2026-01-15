import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

/**
 * Analytics Service for tracking events to Google Analytics 4 and database
 */
export class AnalyticsService {
  private static GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || '';
  private static GA4_API_SECRET = process.env.GA4_API_SECRET || '';
  private static GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

  /**
   * Track event to GA4 via Measurement Protocol
   */
  private static async trackToGA4(
    clientId: string,
    eventName: string,
    eventParams: Record<string, any>
  ): Promise<boolean> {
    if (!this.GA4_MEASUREMENT_ID || !this.GA4_API_SECRET) {
      logger.warn('GA4 credentials not configured, skipping GA4 tracking');
      return false;
    }

    try {
      const url = `${this.GA4_ENDPOINT}?measurement_id=${this.GA4_MEASUREMENT_ID}&api_secret=${this.GA4_API_SECRET}`;

      const payload = {
        client_id: clientId,
        events: [
          {
            name: eventName,
            params: {
              ...eventParams,
              timestamp_micros: Date.now() * 1000,
            },
          },
        ],
      };

      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      logger.debug(`GA4 event tracked: ${eventName}`, { clientId, eventParams });
      return true;
    } catch (error) {
      logger.error('Failed to track GA4 event:', error);
      return false;
    }
  }

  /**
   * Track event to database for analytics queries
   */
  private static async trackToDatabase(
    userId: string | null,
    sessionId: string,
    eventName: string,
    eventProperties: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: userId || null,
          sessionId,
          eventName,
          eventProperties: eventProperties as any,
          createdAt: new Date(),
        },
      });

      logger.debug(`DB event tracked: ${eventName}`, { userId, sessionId });
    } catch (error) {
      logger.error('Failed to track database event:', error);
    }
  }

  /**
   * Generic event tracking method
   */
  static async trackEvent(
    eventName: string,
    properties: {
      userId?: string;
      sessionId: string;
      clientId?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const { userId, sessionId, clientId, ...eventProps } = properties;

    // Track to GA4 (async, don't wait)
    if (clientId) {
      this.trackToGA4(clientId, eventName, eventProps).catch((err) => {
        logger.error('GA4 tracking error:', err);
      });
    }

    // Track to database (async, don't wait)
    this.trackToDatabase(userId || null, sessionId, eventName, eventProps).catch(
      (err) => {
        logger.error('Database tracking error:', err);
      }
    );
  }

  // ==================== ACQUISITION EVENTS ====================

  /**
   * Track salon view
   */
  static async trackSalonViewed(params: {
    userId?: string;
    sessionId: string;
    clientId?: string;
    salonId: string;
    salonName: string;
    city: string;
    category: string;
    rating?: number;
  }): Promise<void> {
    await this.trackEvent('salon_viewed', params);
  }

  /**
   * Track search performed
   */
  static async trackSearchPerformed(params: {
    userId?: string;
    sessionId: string;
    clientId?: string;
    query: string;
    filters: Record<string, any>;
    resultsCount: number;
  }): Promise<void> {
    await this.trackEvent('search_performed', params);
  }

  /**
   * Track service viewed
   */
  static async trackServiceViewed(params: {
    userId?: string;
    sessionId: string;
    clientId?: string;
    salonId: string;
    serviceId: string;
    serviceName: string;
    price: number;
  }): Promise<void> {
    await this.trackEvent('service_viewed', params);
  }

  // ==================== ACTIVATION EVENTS ====================

  /**
   * Track user sign-up
   */
  static async trackSignUp(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    method: 'email' | 'google' | 'phone';
    userType: 'client' | 'specialist' | 'salon_owner';
  }): Promise<void> {
    await this.trackEvent('sign_up', params);
  }

  /**
   * Track profile completion
   */
  static async trackProfileCompleted(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    completionPercentage: number;
    timeToComplete: number; // seconds
  }): Promise<void> {
    await this.trackEvent('profile_completed', params);
  }

  /**
   * Track first booking created
   */
  static async trackFirstBookingCreated(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    salonId: string;
    serviceId: string;
    bookingId: string;
    timeToFirstBooking: number; // seconds since signup
  }): Promise<void> {
    await this.trackEvent('first_booking_created', params);
  }

  /**
   * Track salon favorited
   */
  static async trackSalonFavorited(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    salonId: string;
  }): Promise<void> {
    await this.trackEvent('salon_favorited', params);
  }

  // ==================== RETENTION EVENTS ====================

  /**
   * Track session start
   */
  static async trackSessionStart(params: {
    userId?: string;
    sessionId: string;
    clientId?: string;
    daysSinceLastVisit?: number;
    platform: 'web' | 'ios' | 'android';
  }): Promise<void> {
    await this.trackEvent('session_start', params);
  }

  /**
   * Track booking viewed
   */
  static async trackBookingViewed(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    bookingId: string;
    bookingStatus: string;
  }): Promise<void> {
    await this.trackEvent('booking_viewed', params);
  }

  /**
   * Track notification clicked
   */
  static async trackNotificationClicked(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    notificationType: string;
    notificationId: string;
  }): Promise<void> {
    await this.trackEvent('notification_clicked', params);
  }

  /**
   * Track return visit
   */
  static async trackReturnVisit(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    daysSinceSignup: number;
    daysSinceLastVisit: number;
  }): Promise<void> {
    await this.trackEvent('return_visit', params);
  }

  // ==================== REVENUE EVENTS ====================

  /**
   * Track booking created
   */
  static async trackBookingCreated(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    bookingId: string;
    salonId: string;
    serviceId: string;
    serviceName: string;
    price: number;
    bookingDate: string;
    bookingTime: string;
  }): Promise<void> {
    await this.trackEvent('booking_created', params);

    // Also update database metrics
    try {
      await prisma.userActivity.create({
        data: {
          userId: params.userId,
          activityType: 'booking_created',
          metadata: {
            bookingId: params.bookingId,
            salonId: params.salonId,
            price: params.price,
          } as any,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create user activity:', error);
    }
  }

  /**
   * Track payment initiated
   */
  static async trackPaymentInitiated(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    bookingId: string;
    paymentMethod: 'card' | 'cash' | 'payme';
    amount: number;
  }): Promise<void> {
    await this.trackEvent('payment_initiated', params);
  }

  /**
   * Track payment completed
   */
  static async trackPaymentCompleted(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    bookingId: string;
    transactionId: string;
    paymentMethod: 'card' | 'cash' | 'payme';
    amount: number;
    currency: string;
  }): Promise<void> {
    await this.trackEvent('payment_completed', params);
  }

  /**
   * Track booking cancelled
   */
  static async trackBookingCancelled(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    bookingId: string;
    cancellationReason: string;
    daysBeforeBooking: number;
  }): Promise<void> {
    await this.trackEvent('booking_cancelled', params);
  }

  // ==================== REFERRAL EVENTS ====================

  /**
   * Track referral sent
   */
  static async trackReferralSent(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    referralCode: string;
    method: 'whatsapp' | 'telegram' | 'email' | 'copy_link';
  }): Promise<void> {
    await this.trackEvent('referral_sent', params);
  }

  /**
   * Track referral signup
   */
  static async trackReferralSignup(params: {
    newUserId: string;
    sessionId: string;
    clientId?: string;
    referrerId: string;
    referralCode: string;
  }): Promise<void> {
    await this.trackEvent('referral_signup', params);

    // Create referral record in database
    try {
      await prisma.referral.create({
        data: {
          referrerId: params.referrerId,
          referredUserId: params.newUserId,
          referralCode: params.referralCode,
          status: 'completed',
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create referral record:', error);
    }
  }

  /**
   * Track social share
   */
  static async trackSocialShare(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    platform: 'instagram' | 'facebook' | 'telegram' | 'whatsapp';
    contentType: 'salon' | 'booking' | 'review';
    contentId: string;
  }): Promise<void> {
    await this.trackEvent('social_share', params);

    // Create social share record
    try {
      await prisma.socialShare.create({
        data: {
          userId: params.userId,
          platform: params.platform,
          contentType: params.contentType,
          contentId: params.contentId,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create social share record:', error);
    }
  }

  /**
   * Track review submitted
   */
  static async trackReviewSubmitted(params: {
    userId: string;
    sessionId: string;
    clientId?: string;
    salonId: string;
    bookingId: string;
    rating: number;
    hasComment: boolean;
  }): Promise<void> {
    await this.trackEvent('review_submitted', params);
  }

  // ==================== ANALYTICS QUERIES ====================

  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(
    userId: string
  ): Promise<{
    totalSessions: number;
    totalBookings: number;
    totalSpent: number;
    lastVisit: Date | null;
    daysSinceSignup: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          bookings: {
            include: {
              payment: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        return {
          totalSessions: 0,
          totalBookings: 0,
          totalSpent: 0,
          lastVisit: null,
          daysSinceSignup: 0,
        };
      }

      const totalSessions = await prisma.analyticsEvent.count({
        where: {
          userId,
          eventName: 'session_start',
        },
      });

      const totalBookings = user.bookings.length;

      const totalSpent = user.bookings.reduce((sum, booking) => {
        return sum + (booking.payment?.amount || 0);
      }, 0);

      const lastVisit = user.activities[0]?.createdAt || null;

      const daysSinceSignup = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        totalSessions,
        totalBookings,
        totalSpent,
        lastVisit,
        daysSinceSignup,
      };
    } catch (error) {
      logger.error('Failed to get user activity summary:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel data
   */
  static async getConversionFunnel(
    startDate: Date,
    endDate: Date
  ): Promise<{
    visitors: number;
    signups: number;
    searchPerformed: number;
    bookingsCreated: number;
    paymentsCompleted: number;
    conversionRate: number;
  }> {
    try {
      const dateFilter = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      const [visitors, signups, searches, bookings, payments] = await Promise.all([
        prisma.analyticsEvent.groupBy({
          by: ['sessionId'],
          where: {
            ...dateFilter,
            eventName: 'page_view',
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            ...dateFilter,
            eventName: 'sign_up',
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            ...dateFilter,
            eventName: 'search_performed',
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            ...dateFilter,
            eventName: 'booking_created',
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            ...dateFilter,
            eventName: 'payment_completed',
          },
        }),
      ]);

      const visitorsCount = visitors.length;
      const conversionRate =
        visitorsCount > 0 ? (payments / visitorsCount) * 100 : 0;

      return {
        visitors: visitorsCount,
        signups,
        searchPerformed: searches,
        bookingsCreated: bookings,
        paymentsCompleted: payments,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      };
    } catch (error) {
      logger.error('Failed to get conversion funnel:', error);
      throw error;
    }
  }

  /**
   * Get revenue metrics
   */
  static async getRevenueMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    totalBookings: number;
    averageOrderValue: number;
    revenueByDay: Array<{ date: string; revenue: number }>;
  }> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          status: 'completed',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalBookings = payments.length;
      const averageOrderValue =
        totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Group by day
      const revenueByDay: Record<string, number> = {};
      payments.forEach((payment) => {
        const date = payment.createdAt.toISOString().split('T')[0];
        revenueByDay[date] = (revenueByDay[date] || 0) + payment.amount;
      });

      return {
        totalRevenue,
        totalBookings,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({
          date,
          revenue,
        })),
      };
    } catch (error) {
      logger.error('Failed to get revenue metrics:', error);
      throw error;
    }
  }

  /**
   * Get retention metrics (DAU, WAU, MAU)
   */
  static async getRetentionMetrics(): Promise<{
    dau: number;
    wau: number;
    mau: number;
    dauMauRatio: number;
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [dauUsers, wauUsers, mauUsers] = await Promise.all([
        prisma.userActivity.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: oneDayAgo,
            },
          },
        }),
        prisma.userActivity.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
        prisma.userActivity.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

      const dau = dauUsers.length;
      const wau = wauUsers.length;
      const mau = mauUsers.length;
      const dauMauRatio = mau > 0 ? (dau / mau) * 100 : 0;

      return {
        dau,
        wau,
        mau,
        dauMauRatio: parseFloat(dauMauRatio.toFixed(2)),
      };
    } catch (error) {
      logger.error('Failed to get retention metrics:', error);
      throw error;
    }
  }

  /**
   * Get top salons by bookings
   */
  static async getTopSalons(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<
    Array<{
      salonId: string;
      salonName: string;
      bookingsCount: number;
      revenue: number;
    }>
  > {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          salon: {
            select: {
              id: true,
              name: true,
            },
          },
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      });

      // Group by salon
      const salonStats: Record<
        string,
        { salonName: string; bookingsCount: number; revenue: number }
      > = {};

      bookings.forEach((booking) => {
        const salonId = booking.salon.id;
        if (!salonStats[salonId]) {
          salonStats[salonId] = {
            salonName: booking.salon.name,
            bookingsCount: 0,
            revenue: 0,
          };
        }
        salonStats[salonId].bookingsCount++;
        if (booking.payment?.status === 'completed') {
          salonStats[salonId].revenue += booking.payment.amount;
        }
      });

      // Convert to array and sort
      return Object.entries(salonStats)
        .map(([salonId, stats]) => ({
          salonId,
          ...stats,
        }))
        .sort((a, b) => b.bookingsCount - a.bookingsCount)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top salons:', error);
      throw error;
    }
  }
}
