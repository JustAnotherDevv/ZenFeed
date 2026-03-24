import type { FeedItem, EventItem } from '@/types/feed'
import { generateId } from '@/lib/utils'
import { SEARCH_LIMIT } from '@/lib/constants'
import { callOpenRouter } from './openrouter'
import { useDebugStore } from '@/store/useDebugStore'
import { parsePrizeAmount } from '@/lib/utils'

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
  location?: string
  tags?: string[]
  techStack?: string[]
  teamSize?: string
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

async function generateNewsQueries(
  naturalDescription: string,
  keywords: string[]
): Promise<string[]> {
  try {
    const text = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You generate Google search queries to find recent news articles.
Return ONLY a JSON array of exactly 4 query strings. No explanation, no markdown.`,
        },
        {
          role: 'user',
          content: `User wants: "${naturalDescription}"
Keywords: ${keywords.join(', ')}

Generate 4 diverse search queries to find recent, high-quality news articles matching this intent.
Rules:
- Query 1: broad, comprehensive coverage of the main topic
- Query 2: focus on latest news and recent developments (include "latest" or "2025" or "2026")
- Query 3: cover a specific angle or sub-topic within the intent
- Query 4: target analysis, insights, or in-depth coverage
- NO site: prefixes — want diverse sources
- Keep queries 3-7 words each
Return JSON array only: ["query1","query2","query3","query4"]`,
        },
      ],
      { maxTokens: 150 }
    )
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : []
  } catch {
    return []
  }
}

export async function searchFeed(
  query: string,
  opts: {
    freshness?: string
    limit?: number
    negativeKeywords?: string[]
    naturalDescription?: string
    onProgress?: (items: FeedItem[]) => void
  } = {}
): Promise<FeedItem[]> {
  const apiKey = getApiKey()
  if (!apiKey) return getMockResults(query)

  const keywords = query.replace(/[()]/g, '').split(/ OR |-"[^"]*"/).map(s => s.trim()).filter(Boolean)
  let queries: string[] = []

  if (opts.naturalDescription) {
    queries = await generateNewsQueries(opts.naturalDescription, keywords)
  }
  if (queries.length === 0) {
    queries = [query]
  }

  const seenUrls = new Set<string>()
  const allResults: FeedItem[] = []

  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(`${BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            query: q,
            limit: opts.limit ?? SEARCH_LIMIT,
            tbs: opts.freshness ?? 'qdr:d',
            scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
          }),
        })
        if (!res.ok) return
        const json: FirecrawlResponse = await res.json()
        if (!json.success || !json.data) return

        const results = json.data.map(normalizeResult).filter(item => item.title && item.url)
        const newResults = results.filter(r => r.url && !seenUrls.has(r.url))
        for (const r of newResults) seenUrls.add(r.url)

        const filtered = postFilter(newResults, opts.negativeKeywords ?? [])
        if (filtered.length > 0) {
          opts.onProgress?.(filtered)
          allResults.push(...filtered)
        }
      } catch {
        // skip failed queries
      }
    })
  )

  return allResults.slice(0, 30)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function scrapeMarkdown(url: string, apiKey: string, attempt = 0): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    })

    if (res.status === 429) {
      if (attempt >= 3) return null
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '0', 10)
      const delay = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 2000
      await sleep(delay)
      return scrapeMarkdown(url, apiKey, attempt + 1)
    }

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
  const truncated = markdown.slice(0, 6000)
  const negPrompt = opts.negativeKeywords.length
    ? `\nExclude if related to: ${opts.negativeKeywords.join(', ')}.`
    : ''
  const intentLine = opts.naturalDescription
    ? `The user wants: "${opts.naturalDescription}"`
    : 'The user wants: hackathons, competitions, or grant events'

  const systemPrompt = `You are a strict event relevance classifier. Today is ${today}.
${intentLine}${negPrompt}

Return JSON only. No markdown, no text outside the JSON object.

STEP 1 — Relevance check:
Does this page match what the user wants? If it is a poetry contest, writing contest, sports event, job listing, news article, or anything that does NOT match the user's stated intent → set isEvent:false immediately.
isEvent must be TRUE only when: (1) the page is a specific event/hackathon/competition/grant AND (2) its topic directly matches the user's intent.

STEP 2 — List check:
If this is a LIST or AGGREGATOR page with multiple events → set isEvent:false, isEventList:true, extract up to 30 individual event URLs into eventLinks.

STEP 3 — If isEvent is true, extract:
name, description (1-2 sentences), prizes (total prize pool as string e.g. "$50,000"), deadline (ISO), startDate (ISO), endDate (ISO), registrationUrl, organizer, location (city and country where event is held, or "online" if virtual, or "hybrid").
tags: array of short track/theme labels max 5 (e.g. "DeFi", "AI/ML", "GameFi", "Web3", "Zero Knowledge", "Mobile", "Sustainability") — only if explicitly mentioned.
techStack: array of required technologies max 5 (e.g. "Solidity", "Python", "React") — only if explicitly required.
teamSize: team size requirement as a short string (e.g. "solo or teams up to 4") — only if explicitly stated, otherwise omit.

STATUS — check all dates carefully:
- "ended": deadline < ${today}, OR endDate < ${today}, OR page says "submission period ended" / "results announced" / "winners" / "concluded" / "closed"
- "upcoming": event hasn't started yet (startDate > ${today})
- "active": currently accepting submissions
When uncertain → default to "ended".

reasoning: 2-3 sentences — state what type of page it is, whether it matches the user's intent, what dates you found, and why you set the status.

JSON shape:
{"isEvent":bool,"isEventList":bool,"eventLinks":[],"name":"","description":"","prizes":"","deadline":"","startDate":"","endDate":"","status":"active|upcoming|ended","registrationUrl":"","organizer":"","location":"","tags":[],"techStack":[],"teamSize":"","reasoning":""}`

  const userMsg = `URL: ${url}\n\nPage content:\n${truncated}`

  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { maxTokens: 800 }
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
    prizeAmount: parsePrizeAmount(extracted.prizes),
    deadline: extracted.deadline,
    startDate: extracted.startDate,
    endDate: extracted.endDate,
    status: extracted.status ?? 'active',
    registrationUrl: extracted.registrationUrl,
    organizer: extracted.organizer,
    location: extracted.location,
    tags: extracted.tags?.length ? extracted.tags : undefined,
    techStack: extracted.techStack?.length ? extracted.techStack : undefined,
    teamSize: extracted.teamSize || undefined,
  }
}

async function processUrl(
  url: string,
  apiKey: string,
  opts: { negativeKeywords: string[]; naturalDescription?: string; phase: 'scrape' | 'sublink'; processedUrls: Set<string> },
  meta?: FirecrawlSearchResult
): Promise<{ event?: EventItem; subLinks?: string[] }> {
  // Skip if already processed (handles duplicates in sub-link lists)
  if (opts.processedUrls.has(url)) return {}
  opts.processedUrls.add(url)
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

async function generateSearchQueries(
  naturalDescription: string,
  keywords: string[]
): Promise<string[]> {
  try {
    const text = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You generate Google search queries to find open hackathons and competitions.
Return ONLY a JSON array of exactly 8 query strings. No explanation, no markdown.`,
        },
        {
          role: 'user',
          content: `User wants: "${naturalDescription}"
Keywords: ${keywords.join(', ')}

Generate 8 diverse search queries to find CURRENTLY OPEN events matching this intent.
Rules:
- 3 queries MUST use site: prefixes for platforms where these events are listed. Choose the most relevant from: devpost.com, dorahacks.io, ethglobal.com, gitcoin.co, buidlbox.io, lablab.ai, devfolio.co, mlh.io, unstop.com, taikai.network
- 2 queries should target open/upcoming events with deadline urgency (include "open" or "upcoming" or "deadline 2026")
- 1 query should focus on prizes (include "prize" or "prize pool")
- 1 broad discovery query (include "hackathon" or "competition" or "challenge")
- 1 registration-focused query (include "register" or "apply" or "submit")
- All queries MUST include "2026"
- Be HIGHLY SPECIFIC to the exact topic — never generate generic queries
- Keep queries short: 4-8 words each
Return JSON array only: ["q1","q2","q3","q4","q5","q6","q7","q8"]`,
        },
      ],
      { maxTokens: 300 }
    )
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : []
  } catch {
    return []
  }
}

async function runParallelSearches(
  queries: string[],
  apiKey: string,
): Promise<FirecrawlSearchResult[]> {
  const results = await Promise.all(
    queries.map(async q => {
      try {
        const res = await fetch(`${BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            query: q,
            limit: 10,
            tbs: 'qdr:m',
            scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
          }),
        })
        if (!res.ok) return []
        const json: FirecrawlResponse = await res.json()
        return json.data?.filter(r => r.url) ?? []
      } catch {
        return []
      }
    })
  )

  // Merge and dedupe by URL, preserve order (first occurrence wins)
  const seen = new Set<string>()
  const merged: FirecrawlSearchResult[] = []
  for (const batch of results) {
    for (const r of batch) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url)
        merged.push(r)
      }
    }
  }
  return merged.slice(0, 40)
}

export async function searchEvents(
  query: string,
  opts: {
    limit?: number
    negativeKeywords?: string[]
    naturalDescription?: string
    onProgress?: (items: EventItem[]) => void
  } = {}
): Promise<EventItem[]> {
  const apiKey = getApiKey()
  if (!apiKey) return getMockEventResults(query)

  const debug = useDebugStore.getState()
  debug.clear()
  debug.setIntent(opts.naturalDescription ?? '')

  const negativeKeywords = opts.negativeKeywords ?? []

  // Extract keywords from query for query generation
  const keywords = query.replace(/[()]/g, '').split(/ OR |-"[^"]*"/).map(s => s.trim()).filter(Boolean)

  // Phase 1: generate targeted queries + run them in parallel
  const fallbackQuery = `${query} 2026 open register`
  let queries: string[]

  if (opts.naturalDescription) {
    queries = await generateSearchQueries(opts.naturalDescription, keywords)
  }
  if (!queries! || queries.length === 0) {
    queries = [fallbackQuery]
  }
  debug.setQueries(queries)

  const searchResults = await runParallelSearches(queries, apiKey)

  const metaMap = new Map<string, FirecrawlSearchResult>()
  for (const r of searchResults) {
    if (r.url) metaMap.set(r.url, r)
  }

  const topUrls = searchResults.map(r => r.url!)

  // Shared set — prevents any URL from being scraped/analyzed more than once
  const processedUrls = new Set<string>()
  const processOpts = { negativeKeywords, naturalDescription: opts.naturalDescription, phase: 'scrape' as const, processedUrls }

  // Incremental dedup state (so each progress batch has only new items)
  const seenUrl = new Set<string>()
  const seenIdentity = new Set<string>()
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const allEvents: EventItem[] = []

  function addIfNew(event: EventItem): boolean {
    if (seenUrl.has(event.url)) return false
    const key = `${normalize(event.title)}|${event.deadline ?? ''}`
    if (seenIdentity.has(key)) return false
    seenUrl.add(event.url)
    seenIdentity.add(key)
    allEvents.push(event)
    return true
  }

  // Phase 2: scrape + analyze in batches of 5
  const subLinkJobs: (() => Promise<void>)[] = []

  for (let i = 0; i < topUrls.length; i += 5) {
    const batchUrls = topUrls.slice(i, i + 5)
    const batchResults = await Promise.all(
      batchUrls.map(url => processUrl(url, apiKey, processOpts, metaMap.get(url)))
    )

    const batchEvents: EventItem[] = []
    for (const result of batchResults) {
      if (result.event && addIfNew(result.event)) {
        batchEvents.push(result.event)
      }
      if (result.subLinks?.length) {
        const links = [...new Set(result.subLinks)].filter(u => !processedUrls.has(u)).slice(0, 25)
        subLinkJobs.push(async () => {
          const subResults = await batchAll(
            links.map(subUrl => () => processUrl(subUrl, apiKey, { ...processOpts, phase: 'sublink' })),
            5
          )
          const subBatchEvents: EventItem[] = []
          for (const sr of subResults) {
            if (sr.event && addIfNew(sr.event)) {
              subBatchEvents.push(sr.event)
            }
          }
          const filteredSub = postFilter(subBatchEvents, negativeKeywords) as EventItem[]
          if (filteredSub.length > 0) opts.onProgress?.(filteredSub)
        })
      }
    }

    const filteredBatch = postFilter(batchEvents, negativeKeywords) as EventItem[]
    if (filteredBatch.length > 0) opts.onProgress?.(filteredBatch)
  }

  // Process sub-link jobs sequentially to avoid overloading
  for (const job of subLinkJobs) await job()

  // Post-filter final result and sort by deadline
  const filtered = postFilter(allEvents, negativeKeywords) as EventItem[]
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
    prizeAmount: [50000, 25000, 100000, 10000, 75000][i % 5],
    deadline: new Date(now + (i + 1) * 7 * 86400000).toISOString(),
    startDate: new Date(now - 7 * 86400000).toISOString(),
    status: 'active' as const,
    registrationUrl: `https://example.com/hackathon-${i + 1}/register`,
    organizer: ['ETHGlobal', 'Gitcoin', 'DoraHacks', 'Buidlbox', 'DevPost'][i % 5],
    tags: [['DeFi', 'Web3'], ['AI/ML'], ['GameFi', 'NFT'], ['Zero Knowledge'], ['Mobile', 'Web3']][i % 5],
    techStack: [['Solidity', 'React'], ['Python'], ['Unity', 'Solidity'], ['Rust'], ['React Native']][i % 5],
  }))
}
