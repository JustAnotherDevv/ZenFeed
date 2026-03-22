import { useCallback } from 'react'
import { useFeedStore } from '@/store/useFeedStore'
import { searchFeed, searchEvents } from '@/api/firecrawl'
import { buildSearchQuery } from '@/lib/utils'
import { REFRESH_INTERVAL_MS } from '@/lib/constants'
import type { Feed } from '@/types/feed'

async function fetchItemsForFeed(feed: Feed, limit?: number) {
  const query = buildSearchQuery(feed.keywords, feed.negativeKeywords)
  if (feed.feedType === 'events') {
    return searchEvents(query, { limit, negativeKeywords: feed.negativeKeywords, naturalDescription: feed.naturalDescription })
  }
  return searchFeed(query, { freshness: feed.freshness, limit, negativeKeywords: feed.negativeKeywords })
}

export function useFeedSearch() {
  const fetchFeed = useCallback(async (feed: Feed, force = false) => {
    const store = useFeedStore.getState()
    const lastFetched = store.lastFetchedAt[feed.id] ?? 0
    const stale = Date.now() - lastFetched > REFRESH_INTERVAL_MS

    if (!force && !stale && (store.itemsCache[feed.id]?.length ?? 0) > 0) return

    store.setLoadingState(feed.id, force ? 'refreshing' : 'loading')

    try {
      const items = await fetchItemsForFeed(feed)
      useFeedStore.getState().setItems(feed.id, items)
      useFeedStore.getState().setLastFetchedAt(feed.id, Date.now())
      useFeedStore.getState().setLoadingState(feed.id, 'idle')
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
