export interface Feed {
  id: string
  name: string
  keywords: string[]
  freshness: 'qdr:d' | 'qdr:w' | 'qdr:m'
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

export interface TranscriptMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: number
}

export type AgentStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error'
