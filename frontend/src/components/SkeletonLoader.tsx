interface SkeletonLoaderProps {
  className?: string
  count?: number
  height?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
}

export default function SkeletonLoader({
  className = '',
  count = 1,
  height = 'h-4',
  variant = 'rectangular'
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'

  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-lg h-64'
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${height} ${className}`

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={classes} />
      ))}
    </>
  )
}

// Специализированные компоненты для разных типов контента

export function SalonCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <SkeletonLoader variant="rectangular" height="h-48" />
      <div className="p-4 space-y-3">
        <SkeletonLoader variant="text" height="h-6" className="w-3/4" />
        <SkeletonLoader variant="text" height="h-4" className="w-full" />
        <div className="flex items-center space-x-2">
          <SkeletonLoader variant="text" height="h-4" className="w-20" />
          <SkeletonLoader variant="text" height="h-4" className="w-16" />
        </div>
      </div>
    </div>
  )
}

export function BookingCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" height="h-6" className="w-1/2" />
          <SkeletonLoader variant="text" height="h-4" className="w-3/4" />
        </div>
        <SkeletonLoader variant="rectangular" height="h-8" className="w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        <div className="space-y-2">
          <SkeletonLoader variant="text" height="h-3" className="w-16" />
          <SkeletonLoader variant="text" height="h-5" className="w-32" />
        </div>
        <div className="space-y-2">
          <SkeletonLoader variant="text" height="h-3" className="w-16" />
          <SkeletonLoader variant="text" height="h-5" className="w-32" />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <SkeletonLoader variant="text" height="h-8" className="w-32" />
        <SkeletonLoader variant="rectangular" height="h-10" className="w-28" />
      </div>
    </div>
  )
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-start">
        <SkeletonLoader variant="text" height="h-5" className="w-1/2" />
        <SkeletonLoader variant="text" height="h-6" className="w-24" />
      </div>
      <SkeletonLoader variant="text" height="h-4" className="w-full" />
      <SkeletonLoader variant="text" height="h-4" className="w-3/4" />
      <div className="flex items-center space-x-2">
        <SkeletonLoader variant="text" height="h-4" className="w-20" />
        <SkeletonLoader variant="text" height="h-4" className="w-20" />
      </div>
    </div>
  )
}

export function MasterCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-start space-x-4">
        <SkeletonLoader variant="circular" height="h-16 w-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" height="h-5" className="w-1/2" />
          <SkeletonLoader variant="text" height="h-4" className="w-2/3" />
          <div className="flex items-center space-x-2">
            <SkeletonLoader variant="text" height="h-4" className="w-20" />
            <SkeletonLoader variant="text" height="h-4" className="w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <SkeletonLoader variant="text" height="h-4" className="w-full" />
        </td>
      ))}
    </tr>
  )
}
