import type { FeedItem, EventItem } from '@/types/feed'
import { generateId } from '@/lib/utils'
import { SEARCH_LIMIT } from '@/lib/constants'
import { callOpenRouter } from './openrouter'
import { useDebugStore } from '@/store/useDebugStore'

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

interface ExtractedEvent {
  isEvent?: boolean
  isEventList?: boolean
  eventLinks?: string[]
  name?: string
  description?: string
  prizes?: string
  deadline?: string
  startDate?: string
  endDate?: string
  status?: 'active' | 'upcoming' | 'ended'
  registrationUrl?: string
  organizer?: string
  reasoning?: string
}

function getApiKey(): string | null {
  const key = import.meta.env.VITE_FIRECRAWL_KEY
  return key && key !== 'your_key_here' ? key : null
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
  return { id: generateId(), title, summary, url, imageUrl, source, publishedAt }
}

function postFilter(items: FeedItem[], negativeKeywords: string[]): FeedItem[] {
  if (!negativeKeywords.length) return items
  const neg = negativeKeywords.map(k => k.toLowerCase())
  return items.filter(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase()
    return !neg.some(k => text.includes(k))
  })
}

// Run an array of async tasks in batches of `size` to avoid overwhelming the API
async function batchAll<T>(fns: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < fns.length; i += size) {
    const batch = fns.slice(i, i + size)
    const batchResults = await Promise.all(batch.map(fn => fn()))
    results.push(...batchResults)
  }
  return results
}

export async function searchFeed(
  query: string,
  opts: { freshness?: string; limit?: number; negativeKeywords?: string[] } = {}
): Promise<FeedItem[]> {
  const apiKey = getApiKey()
  if (!apiKey) return getMockResults(query)

  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      limit: opts.limit ?? SEARCH_LIMIT,
      tbs: opts.freshness ?? 'qdr:d',
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
  })

  if (!res.ok) throw new Error(`Firecrawl API error: ${res.status}`)
  const json: FirecrawlResponse = await res.json()
  if (!json.success || !json.data) throw new Error(json.error ?? 'Unknown Firecrawl error')
  const results = json.data.map(normalizeResult).filter(item => item.title && item.url)
  return postFilter(results, opts.negativeKeywords ?? [])
}

async function scrapeMarkdown(url: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data?.markdown ?? null
  } catch {
    return null
  }
}

async function analyzeWithAI(
  url: string,
  markdown: string,
  opts: {
    negativeKeywords: string[]
    naturalDescription?: string
    isSublink?: boolean
  }
): Promise<ExtractedEvent> {
  const today = new Date().toISOString().split('T')[0]
  const truncated = markdown.slice(0, 4000)
  const negPrompt = opts.negativeKeywords.length
    ? `\nExclude if related to: ${opts.negativeKeywords.join(', ')}.`
    : ''
  const intentPrompt = opts.naturalDescription
    ? `\nThe user is looking for: "${opts.naturalDescription}"\nOnly classify as a relevant event if it matches this intent.`
    : ''

  const systemPrompt = `You are an event page classifier. Today is ${today}.${negPrompt}${intentPrompt}

Analyze the page content and return JSON only (no markdown, no explanation outside the JSON).

Classify the page as one of:
A) SPECIFIC event/hackathon/competition/grant page → isEvent:true, isEventList:false
B) LIST page with multiple events → isEvent:false, isEventList:true, extract eventLinks (up to 30 URLs)
C) Job listing, article, unrelated → isEvent:false, isEventList:false

For type A, extract: name, description (1-2 sentences), prizes (total prize pool as string), deadline (ISO date of submission deadline), startDate (ISO), endDate (ISO), registrationUrl, organizer.

STATUS RULES — read all dates on the page carefully:
- "ended": deadline < ${today}, OR endDate < ${today}, OR page says "submission period ended" / "results announced" / "winners" / "concluded" / "closed"
- "upcoming": startDate > ${today} and submissions not open yet
- "active": currently accepting submissions

When uncertain about status, default to "ended" rather than "active".

Include a "reasoning" field (1-3 sentences) explaining: what type of page this is, what dates you found, and why you set the status you did.

Return valid JSON matching this shape:
{"isEvent":bool,"isEventList":bool,"eventLinks":[],"name":"","description":"","prizes":"","deadline":"","startDate":"","endDate":"","status":"active|upcoming|ended","registrationUrl":"","organizer":"","reasoning":""}`

  const userMsg = `URL: ${url}\n\nPage content:\n${truncated}`

  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { maxTokens: 600 }
    )
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { isEvent: false, isEventList: false, reasoning: 'AI returned no JSON' }
    return JSON.parse(match[0]) as ExtractedEvent
  } catch (e) {
    return { isEvent: false, isEventList: false, reasoning: `AI error: ${e}` }
  }
}

function isDefinitelyEnded(extracted: ExtractedEvent): boolean {
  const now = Date.now()
  const checkDate = (d?: string) => !!d && !isNaN(new Date(d).getTime()) && new Date(d).getTime() < now
  if (extracted.status === 'ended') return true
  if (checkDate(extracted.deadline)) return true
  if (checkDate(extracted.endDate)) return true
  return false
}

function makeEventItem(extracted: ExtractedEvent, meta: FirecrawlSearchResult | undefined, url: string): EventItem {
  const base = meta
    ? normalizeResult(meta)
    : { id: generateId(), title: '', summary: '', url, source: new URL(url).hostname.replace('www.', ''), imageUrl: undefined, publishedAt: undefined }

  return {
    ...base,
    itemType: 'event',
    title: extracted.name ?? base.title,
    summary: extracted.description ?? base.summary,
    prizes: extracted.prizes,
    deadline: extracted.deadline,
    startDate: extracted.startDate,
    endDate: extracted.endDate,
    status: extracted.status ?? 'active',
    registrationUrl: extracted.registrationUrl,
    organizer: extracted.organizer,
  }
}

async function processUrl(
  url: string,
  apiKey: string,
  opts: { negativeKeywords: string[]; naturalDescription?: string; phase: 'scrape' | 'sublink' },
  meta?: FirecrawlSearchResult
): Promise<{ event?: EventItem; subLinks?: string[] }> {
  const debug = useDebugStore.getState()

  // Step 1: scrape markdown
  const markdown = await scrapeMarkdown(url, apiKey)
  if (!markdown) {
    debug.log({ url, phase: opts.phase, status: 'timeout', reason: 'Firecrawl scrape failed or timed out' })
    return {}
  }

  // Step 2: analyze with OpenRouter
  const extracted = await analyzeWithAI(url, markdown, {
    negativeKeywords: opts.negativeKeywords,
    naturalDescription: opts.naturalDescription,
    isSublink: opts.phase === 'sublink',
  })

  if (extracted.isEventList && extracted.eventLinks?.length) {
    debug.log({
      url, phase: opts.phase, status: 'list',
      reason: `List page — found ${extracted.eventLinks.length} sub-links`,
      reasoning: extracted.reasoning,
      extracted: extracted as Record<string, unknown>,
    })
    return { subLinks: extracted.eventLinks }
  }

  if (!extracted.isEvent) {
    debug.log({
      url, phase: opts.phase, status: 'discarded',
      reason: extracted.reasoning ?? 'Not classified as a relevant event',
      reasoning: extracted.reasoning,
      extracted: extracted as Record<string, unknown>,
    })
    return {}
  }

  if (isDefinitelyEnded(extracted)) {
    debug.log({
      url, phase: opts.phase, status: 'discarded',
      reason: `Event ended — ${extracted.reasoning ?? `deadline: ${extracted.deadline ?? extracted.endDate ?? 'unknown'}`}`,
      reasoning: extracted.reasoning,
      extracted: extracted as Record<string, unknown>,
    })
    return {}
  }

  debug.log({
    url, phase: opts.phase, status: 'accepted',
    reason: extracted.reasoning ?? `Active event: ${extracted.name}`,
    reasoning: extracted.reasoning,
    extracted: extracted as Record<string, unknown>,
  })
  return { event: makeEventItem(extracted, meta, url) }
}

export async function searchEvents(
  query: string,
  opts: { limit?: number; negativeKeywords?: string[]; naturalDescription?: string } = {}
): Promise<EventItem[]> {
  const apiKey = getApiKey()
  if (!apiKey) return getMockEventResults(query)

  const debug = useDebugStore.getState()
  debug.clear()

  const negativeKeywords = opts.negativeKeywords ?? []
  const negStr = negativeKeywords.map(k => `-"${k}"`).join(' ')
  const enhancedQuery = `${query} 2026 deadline prize${negStr ? ' ' + negStr : ''}`

  // Phase 1: search
  const searchRes = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: enhancedQuery,
      limit: opts.limit ?? SEARCH_LIMIT,
      tbs: 'qdr:m',
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
  })

  if (!searchRes.ok) throw new Error(`Firecrawl search error: ${searchRes.status}`)
  const searchJson: FirecrawlResponse = await searchRes.json()
  if (!searchJson.success || !searchJson.data) throw new Error('Search failed')

  const searchResults = searchJson.data.filter(r => r.url)
  const metaMap = new Map<string, FirecrawlSearchResult>()
  for (const r of searchResults) {
    if (r.url) metaMap.set(r.url, r)
  }

  const topUrls = searchResults.slice(0, 10).map(r => r.url!)

  // Phase 2: scrape + analyze in batches of 5
  const processOpts = { negativeKeywords, naturalDescription: opts.naturalDescription, phase: 'scrape' as const }
  const phase2Results = await batchAll(
    topUrls.map(url => () => processUrl(url, apiKey, processOpts, metaMap.get(url))),
    5
  )

  const events: EventItem[] = []
  const subLinkJobs: (() => Promise<void>)[] = []

  for (const result of phase2Results) {
    if (result.event) events.push(result.event)
    if (result.subLinks?.length) {
      const links = result.subLinks.slice(0, 15)
      subLinkJobs.push(async () => {
        const subResults = await batchAll(
          links.map(subUrl => () => processUrl(subUrl, apiKey, { ...processOpts, phase: 'sublink' })),
          5
        )
        for (const sr of subResults) {
          if (sr.event) events.push(sr.event)
        }
      })
    }
  }

  // Process sub-link jobs sequentially to avoid overloading
  for (const job of subLinkJobs) await job()

  // Dedupe by URL
  const seen = new Set<string>()
  const deduped = events.filter(e => {
    if (seen.has(e.url)) return false
    seen.add(e.url)
    return true
  })

  // Post-filter by negative keywords on title/summary
  const filtered = postFilter(deduped, negativeKeywords) as EventItem[]

  // Sort by deadline ascending, nulls last
  filtered.sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  return filtered
}

function getMockResults(query: string): FeedItem[] {
  const topics = query.split(' OR ').slice(0, 3)
  return Array.from({ length: 8 }, (_, i) => ({
    id: generateId(),
    title: `${topics[i % topics.length] ?? 'News'}: Breaking development — ${i + 1}`,
    summary: 'Mock result. Add VITE_FIRECRAWL_KEY to .env to see real results.',
    url: `https://example.com/article-${i + 1}`,
    imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/${i + 1}/400/200` : undefined,
    source: ['TechCrunch', 'Bloomberg', 'Reuters', 'Axios', 'The Verge'][i % 5],
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
  }))
}

function getMockEventResults(query: string): EventItem[] {
  const topics = query.split(' OR ').slice(0, 2)
  const now = Date.now()
  return Array.from({ length: 5 }, (_, i) => ({
    id: generateId(),
    itemType: 'event' as const,
    title: `${topics[i % topics.length] ?? 'Hackathon'} 2026 — Global Edition ${i + 1}`,
    summary: 'Mock event. Add VITE_FIRECRAWL_KEY to .env to see real hackathons.',
    url: `https://example.com/hackathon-${i + 1}`,
    source: ['devpost.com', 'dorahacks.io', 'ethglobal.com', 'gitcoin.co', 'buidlbox.io'][i % 5],
    prizes: ['$50,000', '$25,000', '$100,000', '$10,000', '$75,000'][i % 5],
    deadline: new Date(now + (i + 1) * 7 * 86400000).toISOString(),
    startDate: new Date(now - 7 * 86400000).toISOString(),
    status: 'active' as const,
    registrationUrl: `https://example.com/hackathon-${i + 1}/register`,
    organizer: ['ETHGlobal', 'Gitcoin', 'DoraHacks', 'Buidlbox', 'DevPost'][i % 5],
  }))
}
