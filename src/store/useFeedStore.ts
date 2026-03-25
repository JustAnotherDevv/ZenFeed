import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Feed, AnyFeedItem, TranscriptMessage, AgentStatus, LoadingState } from '@/types/feed'
import { generateId } from '@/lib/utils'
import { dbUpsertFeed, dbDeleteFeed } from '@/lib/supabase'

interface FeedStore {
  // Persisted
  feeds: Feed[]
  hasCompletedOnboarding: boolean

  // Ephemeral
  activeIndex: number
  itemsCache: Record<string, AnyFeedItem[]>
  loadingState: Record<string, LoadingState>
  lastFetchedAt: Record<string, number>
  highlightedItem: Record<string, number | null>
  agentStatus: AgentStatus
  transcript: TranscriptMessage[]

  // Actions
  setFeeds: (feeds: Feed[]) => void
  addFeed: (feed: Omit<Feed, 'id' | 'createdAt'>) => string
  updateFeed: (id: string, patch: Partial<Feed>) => void
  deleteFeed: (id: string) => void
  setActiveIndex: (i: number) => void
  setItems: (feedId: string, items: AnyFeedItem[]) => void
  appendItems: (feedId: string, items: AnyFeedItem[]) => void
  addKeyword: (feedId: string, keyword: string) => void
  setLoadingState: (feedId: string, state: LoadingState) => void
  setLastFetchedAt: (feedId: string, ts: number) => void
  setHighlightedItem: (feedId: string, index: number | null) => void
  setAgentStatus: (s: AgentStatus) => void
  appendTranscript: (msg: TranscriptMessage) => void
  clearTranscript: () => void
  completeOnboarding: () => void
}

export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      feeds: [],
      hasCompletedOnboarding: false,

      activeIndex: 0,
      itemsCache: {},
      loadingState: {},
      lastFetchedAt: {},
      highlightedItem: {},
      agentStatus: 'idle',
      transcript: [],

      setFeeds: (feeds) => set({ feeds }),

      addFeed: (feed) => {
        const id = generateId()
        const newFeed = { ...feed, id, createdAt: Date.now() }
        set((s) => ({ feeds: [...s.feeds, newFeed] }))
        dbUpsertFeed(newFeed)
        return id
      },

      updateFeed: (id, patch) => {
        set((s) => ({ feeds: s.feeds.map((f) => (f.id === id ? { ...f, ...patch } : f)) }))
        const updated = get().feeds.find(f => f.id === id)
        if (updated) dbUpsertFeed(updated)
      },

      deleteFeed: (id) => {
        const { feeds, activeIndex } = get()
        const idx = feeds.findIndex((f) => f.id === id)
        const newFeeds = feeds.filter((f) => f.id !== id)
        const newIdx = Math.min(activeIndex, Math.max(0, newFeeds.length - 1))
        set((s) => {
          const { [id]: _ic, ...itemsCache } = s.itemsCache
          const { [id]: _ls, ...loadingState } = s.loadingState
          const { [id]: _lf, ...lastFetchedAt } = s.lastFetchedAt
          const { [id]: _hi, ...highlightedItem } = s.highlightedItem
          return { feeds: newFeeds, activeIndex: idx <= activeIndex ? Math.max(0, newIdx) : activeIndex, itemsCache, loadingState, lastFetchedAt, highlightedItem }
        })
        dbDeleteFeed(id)
      },

      setActiveIndex: (i) => set({ activeIndex: i }),

      setItems: (feedId, items) =>
        set((s) => ({ itemsCache: { ...s.itemsCache, [feedId]: items } })),

      appendItems: (feedId, items) =>
        set((s) => {
          const existing = s.itemsCache[feedId] ?? []
          const existingUrls = new Set(existing.map((i) => i.url))
          const newItems = items.filter((i) => !existingUrls.has(i.url))
          return { itemsCache: { ...s.itemsCache, [feedId]: [...existing, ...newItems] } }
        }),

      addKeyword: (feedId, keyword) =>
        set((s) => ({
          feeds: s.feeds.map((f) =>
            f.id === feedId && !f.keywords.includes(keyword)
              ? { ...f, keywords: [...f.keywords, keyword] }
              : f
          ),
        })),

      setLoadingState: (feedId, state) =>
        set((s) => ({ loadingState: { ...s.loadingState, [feedId]: state } })),

      setLastFetchedAt: (feedId, ts) =>
        set((s) => ({ lastFetchedAt: { ...s.lastFetchedAt, [feedId]: ts } })),

      setHighlightedItem: (feedId, index) =>
        set((s) => ({ highlightedItem: { ...s.highlightedItem, [feedId]: index } })),

      setAgentStatus: (s) => set({ agentStatus: s }),

      appendTranscript: (msg) =>
        set((s) => ({ transcript: [...s.transcript.slice(-49), msg] })),

      clearTranscript: () => set({ transcript: [] }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'zenfeed-storage',
      partialize: (state) => ({
        feeds: state.feeds,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        itemsCache: state.itemsCache,
        lastFetchedAt: state.lastFetchedAt,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<FeedStore>
        const feeds = (p.feeds ?? []).map(f => ({
          ...f,
          negativeKeywords: f.negativeKeywords ?? [],
        }))
        return {
          ...current,
          ...p,
          feeds,
          itemsCache: p.itemsCache ?? {},
          lastFetchedAt: p.lastFetchedAt ?? {},
        }
      },
    }
  )
)
