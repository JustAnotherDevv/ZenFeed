import { useCallback } from 'react'
import { useConversation } from '@elevenlabs/react'
import { useFeedStore } from '@/store/useFeedStore'
import { searchFeed } from '@/api/firecrawl'
import { buildSearchQuery } from '@/lib/utils'
import { MAX_AGENT_CONTEXT_ITEMS } from '@/lib/constants'
import type { Feed, FeedItem } from '@/types/feed'

function buildDynamicVars(feed: Feed, items: FeedItem[]): Record<string, string> {
  const top = items.slice(0, MAX_AGENT_CONTEXT_ITEMS)
  const vars: Record<string, string> = {
    feed_name: feed.name,
    feed_keywords: feed.keywords.join(', '),
    item_count: String(items.length),
  }
  for (let i = 0; i < MAX_AGENT_CONTEXT_ITEMS; i++) {
    const item = top[i]
    vars[`item_${i + 1}_title`] = item?.title ?? ''
    vars[`item_${i + 1}_summary`] = item?.summary ? item.summary.slice(0, 150) : ''
    vars[`item_${i + 1}_source`] = item?.source ?? ''
  }
  return vars
}

export function useVoiceAgent(activeFeed: Feed | null) {
  // Only subscribe to the two values we need to render
  const agentStatus = useFeedStore((s) => s.agentStatus)

  const conversation = useConversation({
    onConnect: () => useFeedStore.getState().setAgentStatus('connected'),
    onDisconnect: () => useFeedStore.getState().setAgentStatus('idle'),
    onError: () => useFeedStore.getState().setAgentStatus('error'),
    onMessage: ({ message, source }) => {
      useFeedStore.getState().appendTranscript({
        role: source === 'ai' ? 'agent' : 'user',
        text: message,
        timestamp: Date.now(),
      })
    },
    clientTools: {
      searchMore: async ({ query }: { query: string }) => {
        if (!activeFeed) return 'No active feed.'
        try {
          const items = await searchFeed(query, { freshness: activeFeed.freshness, limit: 5 })
          useFeedStore.getState().appendItems(activeFeed.id, items)
          return `Found ${items.length} new results for "${query}".`
        } catch {
          return 'Search failed. Please try again.'
        }
      },
      addTopicToFeed: async ({ topic }: { topic: string }) => {
        if (!activeFeed) return 'No active feed.'
        useFeedStore.getState().addKeyword(activeFeed.id, topic)
        try {
          const updatedKeywords = [...activeFeed.keywords, topic]
          const items = await searchFeed(buildSearchQuery(updatedKeywords), {
            freshness: activeFeed.freshness,
          })
          useFeedStore.getState().setItems(activeFeed.id, items)
          return `Added "${topic}" to your ${activeFeed.name} feed and refreshed.`
        } catch {
          return `Added "${topic}" to your feed.`
        }
      },
      openArticle: ({ index }: { index: number }) => {
        if (!activeFeed) return 'No active feed.'
        const items = useFeedStore.getState().itemsCache[activeFeed.id] ?? []
        const i = index - 1
        if (i < 0 || i >= items.length) return `No article at position ${index}.`
        useFeedStore.getState().setHighlightedItem(activeFeed.id, i)
        return `Highlighting article ${index}: "${items[i].title}".`
      },
    },
  })

  const startSession = useCallback(async () => {
    if (!activeFeed) return
    const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID
    if (!agentId || agentId === 'your_agent_id_here') {
      useFeedStore.getState().appendTranscript({
        role: 'agent',
        text: 'Add your VITE_ELEVENLABS_AGENT_ID to .env to enable voice.',
        timestamp: Date.now(),
      })
      useFeedStore.getState().setAgentStatus('connected')
      return
    }

    useFeedStore.getState().setAgentStatus('connecting')
    useFeedStore.getState().clearTranscript()

    const items = useFeedStore.getState().itemsCache[activeFeed.id] ?? []
    const dynamicVariables = buildDynamicVars(activeFeed, items)

    await conversation.startSession({
      agentId: agentId as string,
      connectionType: 'webrtc',
      dynamicVariables,
    })
  }, [activeFeed, conversation])

  const endSession = useCallback(async () => {
    await conversation.endSession()
    useFeedStore.getState().setAgentStatus('idle')
  }, [conversation])

  const toggleSession = useCallback(async () => {
    if (agentStatus === 'idle' || agentStatus === 'error') {
      await startSession()
    } else if (agentStatus === 'connected') {
      await endSession()
    }
  }, [agentStatus, startSession, endSession])

  return {
    status: agentStatus,
    isSpeaking: conversation.isSpeaking,
    toggleSession,
    endSession,
  }
}
