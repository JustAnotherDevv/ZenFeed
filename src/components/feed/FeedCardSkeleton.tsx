import { Skeleton } from '@/components/ui/skeleton'

export function FeedCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <Skeleton className="h-36 w-full animate-shimmer" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-24 animate-shimmer" />
        <Skeleton className="h-4 w-full animate-shimmer" />
        <Skeleton className="h-4 w-4/5 animate-shimmer" />
        <Skeleton className="h-3 w-full animate-shimmer" />
        <Skeleton className="h-3 w-3/4 animate-shimmer" />
      </div>
    </div>
  )
}
