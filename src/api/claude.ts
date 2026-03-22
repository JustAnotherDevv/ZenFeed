import type { FeedType } from '@/types/feed'
import { callOpenRouter } from './openrouter'

export interface FeedConfig {
  name: string
  feedType: FeedType
  positiveKeywords: string[]
  negativeKeywords: string[]
  notes: string
}

const SYSTEM_PROMPT = `You are a search configuration assistant for a personalized feed app.
Parse the user's description of what they want in their feed into a structured JSON config.
Return ONLY valid JSON, no explanation.

Rules:
- feedType must be "events" if they want hackathons, competitions, contests, grants, conferences, or specific events to attend/participate in
- feedType must be "news" for general news, articles, updates, trends
- positiveKeywords: specific search terms that will find what they want (4-8 terms)
- negativeKeywords: terms to exclude from results (things they explicitly don't want, or obvious noise for the topic)
- name: short 2-4 word feed name
- notes: one sentence summarizing what to look for

For hackathon/events feeds, always add these negativeKeywords unless user says otherwise:
"job posting", "hiring", "salary", "job offer", "employment", "past winners", "results announced"

Return format:
{"name":"...","feedType":"news|events","positiveKeywords":["..."],"negativeKeywords":["..."],"notes":"..."}`

export async function parseFeedDescription(description: string): Promise<FeedConfig> {
  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: description },
      ],
      { maxTokens: 400 }
    )
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    if (!parsed.name || !parsed.positiveKeywords?.length) return heuristicParse(description)
    return parsed as FeedConfig
  } catch {
    return heuristicParse(description)
  }
}

function heuristicParse(description: string): FeedConfig {
  const lower = description.toLowerCase()
  const isEvents = /hackathon|competition|contest|grant|bounty|event|conference|summit|award|prize/i.test(lower)

  // Extract "not/no/exclude/without" phrases
  const negMatch = lower.match(/(?:not|no |exclude|without|don't want|avoid|skip)\s+([^,.]+)/gi) ?? []
  const negativeKeywords = negMatch
    .map(m => m.replace(/^(?:not|no |exclude|without|don't want|avoid|skip)\s+/i, '').trim())
    .filter(Boolean)
    .slice(0, 6)

  if (isEvents) {
    negativeKeywords.push(...['job posting', 'hiring', 'salary', 'results announced', 'past winners'])
  }

  // Simple positive keyword extraction: meaningful words from description
  const stopWords = new Set(['i', 'want', 'find', 'show', 'me', 'the', 'a', 'an', 'and', 'or', 'to', 'for', 'in', 'on', 'of', 'that', 'with', 'about', 'just', 'only', 'some'])
  const words = description
    .replace(/not\s+\S+/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .slice(0, 6)
    .map(w => w.replace(/[^a-zA-Z0-9 ]/g, ''))

  const name = words.slice(0, 3).join(' ') || (isEvents ? 'Events Feed' : 'News Feed')

  return {
    name,
    feedType: isEvents ? 'events' : 'news',
    positiveKeywords: words.length > 0 ? words : [description.slice(0, 40)],
    negativeKeywords: [...new Set(negativeKeywords)],
    notes: description,
  }
}
