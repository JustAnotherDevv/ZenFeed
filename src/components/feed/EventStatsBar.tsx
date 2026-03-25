import type { EventItem } from '@/types/feed'

interface EventStatsBarProps {
  items: EventItem[]
  intent?: string
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

export function EventStatsBar({ items }: EventStatsBarProps) {
  if (items.length === 0) return null

  const active = items.filter(e => e.status === 'active').length
  const upcoming = items.filter(e => e.status === 'upcoming').length
  const totalPrize = items.reduce((sum, e) => sum + (e.prizeAmount ?? 0), 0)

  const locationCounts = new Map<string, number>()
  for (const e of items) {
    if (e.location && e.location.toLowerCase() !== 'online' && e.location.toLowerCase() !== 'hybrid') {
      const city = e.location.split(',')[0].trim()
      locationCounts.set(city, (locationCounts.get(city) ?? 0) + 1)
    }
  }
  const onlineCount = items.filter(e => e.location?.toLowerCase() === 'online' || e.location?.toLowerCase() === 'hybrid').length
  const topCities = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const withDeadlines = items
    .filter(e => e.deadline && new Date(e.deadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
  const nextDeadlineDays = withDeadlines[0]?.deadline
    ? Math.ceil((new Date(withDeadlines[0].deadline).getTime() - Date.now()) / 86400000)
    : null

  const parts: string[] = []

  if (totalPrize > 0) parts.push(formatMoney(totalPrize) + ' prizes')
  if (active > 0) parts.push(`${active} active`)
  if (upcoming > 0) parts.push(`${upcoming} upcoming`)
  if (nextDeadlineDays !== null) parts.push(`next deadline ${nextDeadlineDays}d`)
  if (topCities.length > 0) parts.push(topCities.map(([c]) => c).join(', '))
  if (onlineCount > 0) parts.push(`${onlineCount} online`)

  if (parts.length === 0) return null

  return (
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex flex-wrap gap-x-0 gap-y-0.5 leading-5">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2 opacity-40">//</span>}
          <span>{part}</span>
        </span>
      ))}
    </div>
  )
}
