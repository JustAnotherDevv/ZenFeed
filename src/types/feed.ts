export type FeedType = 'news' | 'events'

export interface Feed {
  id: string
  name: string
  keywords: string[]
  negativeKeywords: string[]
  freshness: 'qdr:d' | 'qdr:w' | 'qdr:m'
  feedType: FeedType
  naturalDescription?: string
  createdAt: number
}

export interface FeedItem {
  id: string
  title: string
  summary: string
  url: string
  imageUrl?: string
  source: string
  publishedAt?: string
}

export interface EventItem extends FeedItem {
  itemType: 'event'
  prizes?: string
  prizeAmount?: number   // parsed numeric value for sorting
  deadline?: string
  startDate?: string
  endDate?: string
  status: 'active' | 'upcoming' | 'ended'
  registrationUrl?: string
  organizer?: string
  location?: string      // city/country or "online"
}

export type AnyFeedItem = FeedItem | EventItem

export interface TranscriptMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: number
}

export type AgentStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error'
