import { useEffect, useRef, useCallback } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { FeedCard } from './FeedCard'
import { EventCard } from './EventCard'
import { FeedCardSkeleton } from './FeedCardSkeleton'
import { EmptyFeedState } from './EmptyFeedState'
import type { Feed, AnyFeedItem } from '@/types/feed'

interface FeedViewProps {
  feed: Feed
}

const EMPTY_ITEMS: AnyFeedItem[] = []

function isEventItem(item: AnyFeedItem): item is import('@/types/feed').EventItem {
  return 'itemType' in item && item.itemType === 'event'
}

export function FeedView({ feed }: FeedViewProps) {
  const items = useFeedStore((s) => s.itemsCache[feed.id] ?? EMPTY_ITEMS)
  const loadingState = useFeedStore((s) => s.loadingState[feed.id] ?? 'idle')
  const highlightedItem = useFeedStore((s) => s.highlightedItem[feed.id] ?? null)
  const { fetchFeed, refresh } = useFeedSearch()
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    fetchFeed(feed)
  }, [feed.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (highlightedItem !== null && cardRefs.current[highlightedItem]) {
      cardRefs.current[highlightedItem]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedItem])

  const handleRefresh = useCallback(() => refresh(feed), [feed, refresh])
  const ptr = usePullToRefresh(handleRefresh)

  const isLoading = loadingState === 'loading'
  const isRefreshing = loadingState === 'refreshing'
  const isError = loadingState === 'error'

  return (
    <div className="h-full overflow-y-auto" {...ptr}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-3 text-primary">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-xs font-medium">
            {feed.feedType === 'events' ? 'Extracting events…' : 'Refreshing…'}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3 pb-32">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <FeedCardSkeleton key={i} />)
        ) : isError && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <AlertCircle className="w-10 h-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Failed to load feed</p>
            <button onClick={handleRefresh} className="text-sm text-primary font-medium">
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyFeedState feedName={feed.name} onRetry={handleRefresh} />
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-1 pb-1">
              {items.length} {feed.feedType === 'events' ? 'events' : 'results'}
            </p>
          {items.map((item, i) => (
            <div key={item.id} ref={(el) => { cardRefs.current[i] = el }}>
              {isEventItem(item) ? (
                <EventCard item={item} index={i} highlighted={highlightedItem === i} />
              ) : (
                <FeedCard item={item} index={i} highlighted={highlightedItem === i} />
              )}
            </div>
          ))}
          </>
        )}
      </div>
    </div>
  )
}
