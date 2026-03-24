import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { FeedCard } from './FeedCard'
import { EventCard } from './EventCard'
import { EventStatsBar } from './EventStatsBar'
import { EventsToolbar, type ViewMode, type SortKey } from './EventsToolbar'
import { FeedCardSkeleton } from './FeedCardSkeleton'
import { EmptyFeedState } from './EmptyFeedState'
import type { Feed, AnyFeedItem, EventItem } from '@/types/feed'

interface FeedViewProps {
  feed: Feed
}

const EMPTY_ITEMS: AnyFeedItem[] = []

function isEventItem(item: AnyFeedItem): item is EventItem {
  return 'itemType' in item && item.itemType === 'event'
}

function sortEvents(items: EventItem[], sort: SortKey): EventItem[] {
  const sorted = [...items]
  const ts = (d?: string) => d ? new Date(d).getTime() : null
  switch (sort) {
    case 'deadline_asc':
      return sorted.sort((a, b) => {
        const ta = ts(a.deadline), tb = ts(b.deadline)
        if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1
        return ta - tb
      })
    case 'deadline_desc':
      return sorted.sort((a, b) => {
        const ta = ts(a.deadline), tb = ts(b.deadline)
        if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1
        return tb - ta
      })
    case 'start_date':
      return sorted.sort((a, b) => {
        const ta = ts(a.startDate), tb = ts(b.startDate)
        if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1
        return ta - tb
      })
    case 'end_date':
      return sorted.sort((a, b) => {
        const ta = ts(a.endDate), tb = ts(b.endDate)
        if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1
        return ta - tb
      })
    case 'prize_desc':
      return sorted.sort((a, b) => (b.prizeAmount ?? 0) - (a.prizeAmount ?? 0))
  }
}

export function FeedView({ feed }: FeedViewProps) {
  const items = useFeedStore((s) => s.itemsCache[feed.id] ?? EMPTY_ITEMS)
  const loadingState = useFeedStore((s) => s.loadingState[feed.id] ?? 'idle')
  const highlightedItem = useFeedStore((s) => s.highlightedItem[feed.id] ?? null)
  const { fetchFeed, refresh } = useFeedSearch()
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const [view, setView] = useState<ViewMode>('list')
  const [sort, setSort] = useState<SortKey>('deadline_asc')

  useEffect(() => { fetchFeed(feed) }, [feed.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const isEvents = feed.feedType === 'events'

  const eventItems = useMemo(() => items.filter(isEventItem), [items])
  const sortedEvents = useMemo(() => sortEvents(eventItems, sort), [eventItems, sort])
  const nonEventItems = useMemo(() => items.filter(i => !isEventItem(i)), [items])

  // For events feed: use sorted events; for news: use items as-is
  const displayItems = isEvents ? sortedEvents : items

  return (
    <div className="h-full overflow-y-auto" {...ptr}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-3 text-primary">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          <span className="text-xs font-medium">
            {isEvents ? 'Extracting events…' : 'Refreshing…'}
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full p-4 pb-32">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <FeedCardSkeleton key={i} />)}
          </div>
        ) : isError && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <AlertCircle className="w-10 h-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Failed to load feed</p>
            <button onClick={handleRefresh} className="text-sm text-primary font-medium">Retry</button>
          </div>
        ) : items.length === 0 ? (
          <EmptyFeedState feedName={feed.name} onRetry={handleRefresh} />
        ) : (
          <>
            {/* Stats + toolbar for events */}
            {isEvents && eventItems.length > 0 && (
              <div className="mb-3 space-y-3">
                <EventStatsBar items={eventItems} intent={feed.naturalDescription} />
                <EventsToolbar view={view} sort={sort} onViewChange={setView} onSortChange={setSort} />
              </div>
            )}

            {/* Result count */}
            <p className="text-xs text-muted-foreground px-1 pb-3">
              {displayItems.length} {isEvents ? 'events' : 'results'}
            </p>

            {/* Cards */}
            {view === 'grid' && isEvents ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {sortedEvents.map((item, i) => (
                  <div key={item.id} ref={(el) => { cardRefs.current[i] = el }}>
                    <EventCard item={item} index={i} highlighted={highlightedItem === i} compact />
                  </div>
                ))}
                {nonEventItems.map((item, i) => (
                  <div key={item.id}><FeedCard item={item} index={i} highlighted={false} /></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {displayItems.map((item, i) => (
                  <div key={item.id} ref={(el) => { cardRefs.current[i] = el }}>
                    {isEventItem(item) ? (
                      <EventCard item={item} index={i} highlighted={highlightedItem === i} />
                    ) : (
                      <FeedCard item={item} index={i} highlighted={highlightedItem === i} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
