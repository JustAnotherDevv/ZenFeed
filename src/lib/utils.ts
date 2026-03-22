import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trimEnd() + '…'
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = Math.floor(diffMs / 3600000)
    const diffM = Math.floor(diffMs / 60000)
    if (diffM < 1) return 'just now'
    if (diffM < 60) return `${diffM}m ago`
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function buildSearchQuery(keywords: string[], negativeKeywords?: string[]): string {
  const positive = keywords.length > 1 ? `(${keywords.join(' OR ')})` : keywords[0] ?? ''
  if (!negativeKeywords?.length) return positive
  const negative = negativeKeywords.map(k => `-"${k}"`).join(' ')
  return `${positive} ${negative}`
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    const diffMs = d.getTime() - Date.now()
    return Math.ceil(diffMs / 86400000)
  } catch {
    return null
  }
}

export function formatDeadline(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
