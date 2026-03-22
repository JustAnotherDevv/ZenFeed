const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'google/gemini-2.0-flash-lite-001'

function getKey(): string | null {
  const key = import.meta.env.VITE_OPENROUTER_KEY
  return key && key !== 'your_openrouter_key_here' ? key : null
}

export async function callOpenRouter(
  messages: { role: string; content: string }[],
  opts: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = getKey()
  if (!apiKey) throw new Error('No OpenRouter key')

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://zenfeed.app',
      'X-Title': 'ZenFeed',
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 600,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${body}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ''
}
