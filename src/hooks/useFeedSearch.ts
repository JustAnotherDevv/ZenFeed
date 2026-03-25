import { useCallback } from 'react'
import { useFeedStore } from '@/store/useFeedStore'
import { searchFeed, searchEvents } from '@/api/firecrawl'
import { dbSaveItems } from '@/lib/supabase'
import { buildSearchQuery } from '@/lib/utils'
import type { Feed, AnyFeedItem } from '@/types/feed'

// Events change infrequently — cache 4 hours. News is time-sensitive — 30 min.
const REFRESH_INTERVAL_MS = {
  events: 4 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
}

async function fetchItemsForFeed(
  feed: Feed,
  onProgress: (items: AnyFeedItem[]) => void,
  limit?: number
) {
  const query = buildSearchQuery(feed.keywords, feed.negativeKeywords)
  if (feed.feedType === 'events') {
    return searchEvents(query, {
      limit,
      negativeKeywords: feed.negativeKeywords,
      naturalDescription: feed.naturalDescription,
      onProgress,
    })
  }
  return searchFeed(query, {
    freshness: feed.freshness,
    limit,
    negativeKeywords: feed.negativeKeywords,
    naturalDescription: feed.naturalDescription,
    onProgress,
  })
}

export function useFeedSearch() {
  const fetchFeed = useCallback(async (feed: Feed, force = false) => {
    const store = useFeedStore.getState()
    const lastFetched = store.lastFetchedAt[feed.id] ?? 0
    const interval = REFRESH_INTERVAL_MS[feed.feedType] ?? REFRESH_INTERVAL_MS.news
    const stale = Date.now() - lastFetched > interval
    const hasCache = (store.itemsCache[feed.id]?.length ?? 0) > 0

    if (!force && !stale && hasCache) return

    // Re-entry guard — don't start a second fetch if one is already running
    const currentState = store.loadingState[feed.id]
    if (!force && (currentState === 'loading' || currentState === 'streaming')) return

    // Keep cached cards visible while refreshing — don't clear yet
    store.setLoadingState(feed.id, hasCache ? 'streaming' : 'loading')

    let firstProgress = true

    const onProgress = (items: AnyFeedItem[]) => {
      const s = useFeedStore.getState()
      if (firstProgress) {
        firstProgress = false
        s.setItems(feed.id, [])         // clear old cache only when fresh data arrives
        s.setLoadingState(feed.id, 'streaming')
      }
      s.appendItems(feed.id, items)
    }

    try {
      await fetchItemsForFeed(feed, onProgress)
      const finalItems = useFeedStore.getState().itemsCache[feed.id] ?? []
      useFeedStore.getState().setLoadingState(feed.id, 'idle')
      useFeedStore.getState().setLastFetchedAt(feed.id, Date.now())
      dbSaveItems(feed.id, finalItems).catch(console.error)
    } catch (err) {
      console.error('Feed fetch error:', err)
      useFeedStore.getState().setLoadingState(feed.id, 'error')
    }
  }, [])

  const appendSearch = useCallback(async (feed: Feed, query: string) => {
    try {
      const items = feed.feedType === 'events'
        ? await searchEvents(query, { limit: 5, negativeKeywords: feed.negativeKeywords })
        : await searchFeed(query, { freshness: feed.freshness, limit: 5, negativeKeywords: feed.negativeKeywords })
      useFeedStore.getState().appendItems(feed.id, items)
    } catch (err) {
      console.error('Append search error:', err)
    }
  }, [])

  const refresh = useCallback((feed: Feed) => fetchFeed(feed, true), [fetchFeed])

  return { fetchFeed, appendSearch, refresh }
}
