export function FeedCardSkeleton() {
  return (
    <div className="bg-card border-b border-border overflow-hidden">
      <div className="p-4 space-y-2.5">
        <div className="h-2.5 w-20 animate-shimmer" />
        <div className="h-3.5 w-full animate-shimmer" />
        <div className="h-3.5 w-4/5 animate-shimmer" />
        <div className="h-2.5 w-full animate-shimmer" />
        <div className="h-2.5 w-3/4 animate-shimmer" />
      </div>
    </div>
  )
}
