import type { FeedItem } from '@/types/feed'
import { generateId } from '@/lib/utils'
import { SEARCH_LIMIT } from '@/lib/constants'

const BASE = 'https://api.firecrawl.dev/v1'

interface FirecrawlSearchResult {
  title?: string
  description?: string
  url?: string
  markdown?: string
  metadata?: {
    title?: string
    description?: string
    ogImage?: string
    sourceURL?: string
    publishedTime?: string
    siteName?: string
  }
}

interface FirecrawlResponse {
  success: boolean
  data?: FirecrawlSearchResult[]
  error?: string
}

function normalizeResult(r: FirecrawlSearchResult): FeedItem {
  const title = r.title ?? r.metadata?.title ?? 'Untitled'
  const summary =
    r.description ??
    r.metadata?.description ??
    (r.markdown ? r.markdown.slice(0, 200).replace(/[#*`]/g, '') : '') ??
    ''
  const url = r.url ?? r.metadata?.sourceURL ?? ''
  const imageUrl = r.metadata?.ogImage
  const source = r.metadata?.siteName ?? (url ? new URL(url).hostname.replace('www.', '') : '')
  const publishedAt = r.metadata?.publishedTime

  return {
    id: generateId(),
    title,
    summary,
    url,
    imageUrl,
    source,
    publishedAt,
  }
}

export async function searchFeed(
  query: string,
  opts: { freshness?: string; limit?: number } = {}
): Promise<FeedItem[]> {
  const apiKey = import.meta.env.VITE_FIRECRAWL_KEY

  if (!apiKey || apiKey === 'your_key_here') {
    return getMockResults(query)
  }

  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      limit: opts.limit ?? SEARCH_LIMIT,
      tbs: opts.freshness ?? 'qdr:d',
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Firecrawl API error: ${res.status}`)
  }

  const json: FirecrawlResponse = await res.json()

  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Unknown Firecrawl error')
  }

  return json.data.map(normalizeResult).filter((item) => item.title && item.url)
}

function getMockResults(query: string): FeedItem[] {
  const topics = query.split(' OR ').slice(0, 3)
  return Array.from({ length: 8 }, (_, i) => ({
    id: generateId(),
    title: `${topics[i % topics.length] ?? 'News'}: Breaking development in the space — ${i + 1}`,
    summary:
      'This is a mock article summary. Add your Firecrawl API key to VITE_FIRECRAWL_KEY in .env.local to see real results.',
    url: `https://example.com/article-${i + 1}`,
    imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/${i + 1}/400/200` : undefined,
    source: ['TechCrunch', 'Bloomberg', 'Reuters', 'Axios', 'The Verge'][i % 5],
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
  }))
}
