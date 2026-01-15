import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Salon Card Skeleton Loader
 * Used in: Home page, Search results
 */
export function SalonCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="aspect-[4/3] w-full" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Location */}
        <Skeleton className="h-4 w-1/2" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Footer with reviews */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Booking Calendar Skeleton Loader
 * Used in: Owner dashboard, Master page
 */
export function BookingCalendarSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar section */}
      <Card className="p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[280px] w-full rounded-md" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>

      {/* Time slots section */}
      <Card className="p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Reviews List Skeleton Loader
 * Used in: Salon page reviews tab
 */
export function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

            <div className="flex-1 space-y-2">
              {/* Stars and date */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-4" />
                  ))}
                </div>
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Comment */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Service Card Skeleton Loader
 * Used in: Salon page services tab
 */
export function ServiceCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Master Card Skeleton Loader
 * Used in: Salon page team tab
 */
export function MasterCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />

        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>

        <Skeleton className="h-9 w-24" />
      </div>
    </Card>
  );
}

/**
 * Booking Card Skeleton Loader
 * Used in: Profile page bookings tab
 */
export function BookingCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />

          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Salon Header Skeleton Loader
 * Used in: Salon page header
 */
export function SalonHeaderSkeleton() {
  return (
    <div className="relative">
      {/* Image placeholder */}
      <Skeleton className="h-64 md:h-80 w-full" />

      {/* Overlay content */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="max-w-4xl mx-auto space-y-2">
          <Skeleton className="h-6 w-24 bg-white/20" />
          <Skeleton className="h-10 w-64 bg-white/20" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-5 w-32 bg-white/20" />
            <Skeleton className="h-5 w-40 bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile Header Skeleton Loader
 * Used in: Profile page header
 */
export function ProfileHeaderSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Dashboard Stats Skeleton Loader
 * Used in: Admin dashboard, Owner analytics
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-32" />
        </Card>
      ))}
    </div>
  );
}

/**
 * Owner Salon Card Skeleton Loader
 * Used in: Owner dashboard salons tab
 */
export function OwnerSalonCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-12" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-muted rounded-md">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="p-3 bg-muted rounded-md">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>

      <Skeleton className="h-10 w-full" />
    </Card>
  );
}

/**
 * Map Section Skeleton Loader
 * Used in: Home page map section
 */
export function MapSectionSkeleton() {
  return (
    <section className="py-16 bg-card">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>

        <Card className="overflow-hidden">
          <div className="h-[500px] flex items-center justify-center bg-muted">
            <div className="text-center">
              <Skeleton className="h-12 w-12 mx-auto mb-3" />
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/**
 * Loading Spinner Component
 * Used for inline loading states
 */
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-muted-foreground border-t-primary`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Page Loading Component
 * Full-page loading state
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    </div>
  );
}
