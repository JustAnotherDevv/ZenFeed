import { useCallback } from 'react'
import { useConversation } from '@elevenlabs/react'
import { useFeedStore } from '@/store/useFeedStore'
import { searchFeed } from '@/api/firecrawl'
import { buildSearchQuery } from '@/lib/utils'
import type { Feed, AnyFeedItem, EventItem } from '@/types/feed'

function isEvent(item: AnyFeedItem): item is EventItem {
  return 'itemType' in item && item.itemType === 'event'
}

// Serialize entire feed into a compact text block for the agent.
// Each line: "N. [STATUS] Title | Prizes | Deadline | Source | Summary"
// Total length kept under 8000 chars; truncates least-important fields first.
function buildFeedContext(items: AnyFeedItem[]): string {
  const MAX_CHARS = 7500
  const lines: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const n = i + 1

    if (isEvent(item)) {
      const parts: string[] = [`${n}.`]
      if (item.status) parts.push(`[${item.status.toUpperCase()}]`)
      parts.push(item.title)
      if (item.prizes) parts.push(`prizes: ${item.prizes}`)
      if (item.deadline) parts.push(`deadline: ${item.deadline}`)
      if (item.organizer) parts.push(`by ${item.organizer}`)
      if (item.location) parts.push(item.location)
      if (item.tags?.length) parts.push(`tags: ${item.tags.join(', ')}`)
      if (item.summary) parts.push(item.summary.slice(0, 120))
      lines.push(parts.join(' | '))
    } else {
      const parts: string[] = [`${n}.`, item.title]
      if (item.source) parts.push(item.source)
      if (item.publishedAt) parts.push(item.publishedAt)
      if (item.summary) parts.push(item.summary.slice(0, 120))
      lines.push(parts.join(' | '))
    }
  }

  // Join and truncate to fit within the limit
  let result = lines.join('\n')
  if (result.length > MAX_CHARS) {
    result = result.slice(0, MAX_CHARS) + '\n[truncated]'
  }
  return result
}

function buildDynamicVars(feed: Feed, items: AnyFeedItem[]): Record<string, string> {
  return {
    feed_name: feed.name,
    feed_type: feed.feedType,
    feed_keywords: feed.keywords.join(', '),
    item_count: String(items.length),
    feed_items: buildFeedContext(items),
  }
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
    const dynamicVariables = buildDynamicVars(activeFeed, items as AnyFeedItem[])

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
