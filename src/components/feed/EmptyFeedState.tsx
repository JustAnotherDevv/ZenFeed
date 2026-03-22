import { Rss } from 'lucide-react'

interface EmptyFeedStateProps {
  feedName: string
  onRetry: () => void
}

export function EmptyFeedState({ feedName, onRetry }: EmptyFeedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Rss className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">No articles yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Pull down to refresh your <span className="font-medium text-foreground">{feedName}</span> feed
      </p>
      <button
        onClick={onRetry}
        className="text-sm text-primary font-medium active:opacity-70"
      >
        Try again
      </button>
    </div>
  )
}
