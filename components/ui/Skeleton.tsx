export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
  )
}

export function MenuCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between items-center mt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function MenuGridSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <MenuCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

export function OrderRowSkeleton() {
  return (
    <tr className="border-t border-gray-50">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}
