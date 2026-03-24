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

export function EventStatsBar({ items, intent }: EventStatsBarProps) {
  if (items.length === 0) return null

  const active = items.filter(e => e.status === 'active').length
  const upcoming = items.filter(e => e.status === 'upcoming').length
  const totalPrize = items.reduce((sum, e) => sum + (e.prizeAmount ?? 0), 0)

  // City breakdown from location field
  const locationCounts = new Map<string, number>()
  for (const e of items) {
    if (e.location && e.location.toLowerCase() !== 'online' && e.location.toLowerCase() !== 'hybrid') {
      const city = e.location.split(',')[0].trim()
      locationCounts.set(city, (locationCounts.get(city) ?? 0) + 1)
    }
  }
  const onlineCount = items.filter(e => e.location?.toLowerCase() === 'online' || e.location?.toLowerCase() === 'hybrid').length
  const topCities = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)

  // Next deadline
  const withDeadlines = items
    .filter(e => e.deadline && new Date(e.deadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
  const nextDeadlineDays = withDeadlines[0]?.deadline
    ? Math.ceil((new Date(withDeadlines[0].deadline).getTime() - Date.now()) / 86400000)
    : null

  const stats: { label: string; value: string }[] = []

  if (totalPrize > 0) stats.push({ label: 'Combined prizes', value: formatMoney(totalPrize) })
  if (active > 0 || upcoming > 0) {
    const parts = []
    if (active > 0) parts.push(`${active} active`)
    if (upcoming > 0) parts.push(`${upcoming} upcoming`)
    stats.push({ label: 'Status', value: parts.join(' · ') })
  }
  if (nextDeadlineDays !== null) stats.push({ label: 'Next deadline', value: `${nextDeadlineDays}d` })
  if (topCities.length > 0) {
    stats.push({
      label: `${topCities.length} cit${topCities.length === 1 ? 'y' : 'ies'}`,
      value: topCities.map(([city, n]) => `${city}${n > 1 ? ` (${n})` : ''}`).join(', '),
    })
  }
  if (onlineCount > 0 && topCities.length > 0) {
    stats.push({ label: 'Online', value: `${onlineCount} event${onlineCount > 1 ? 's' : ''}` })
  }

  if (stats.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-primary/8 rounded-xl px-3 py-2"
        >
          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{stat.label}</p>
          <p className="text-xs font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
