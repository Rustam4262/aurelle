/**
 * Feature Flag Hook
 *
 * Provides access to feature flags in React components.
 * Flags are fetched once and cached for the session.
 */

import { useQuery } from "@tanstack/react-query";

interface FeatureFlags {
  ENHANCED_ANALYTICS: boolean;
  BOOKING_RESCHEDULE: boolean;
  MANUAL_BOOKING_CREATE: boolean;
  BULK_SERVICE_UPDATE: boolean;
  MASTER_SCHEDULE_OVERRIDE: boolean;
  ENHANCED_CALENDAR: boolean;
  WORKING_HOURS_BREAKS: boolean;
  SALON_MANAGER_ROLE: boolean;
  EXPORT_EXCEL: boolean;
  EXPORT_PDF: boolean;
}

/**
 * Fetch all feature flags from the server
 */
export const useFeatureFlags = () => {
  return useQuery<FeatureFlags>({
    queryKey: ["/api/feature-flags"],
    queryFn: async () => {
      const response = await fetch("/api/feature-flags");
      if (!response.ok) {
        throw new Error("Failed to fetch feature flags");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Check if a specific feature flag is enabled
 */
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  const { data } = useFeatureFlags();
  return data?.[flag] === true;
};

/**
 * Helper hook to check multiple feature flags at once
 */
export const useFeatureFlagsMultiple = (flags: (keyof FeatureFlags)[]): boolean => {
  const { data } = useFeatureFlags();
  return flags.every((flag) => data?.[flag] === true);
};
