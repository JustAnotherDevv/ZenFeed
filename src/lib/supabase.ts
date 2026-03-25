import { createClient } from '@supabase/supabase-js'
import type { Feed, AnyFeedItem } from '@/types/feed'

function makeClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url') return null
  return createClient(url, key)
}

export const supabase = makeClient()

// Cache table existence in localStorage to avoid repeated 404s on every page load.
// 'true'        → tables confirmed ready, never check again
// 'false:{ts}'  → not ready, retry after 2 min
const LS_KEY = 'zenfeed_sb_tables'

async function tablesExist(): Promise<boolean> {
  const cached = localStorage.getItem(LS_KEY)
  if (cached === 'true') return true
  if (cached?.startsWith('false:')) {
    const ts = Number(cached.split(':')[1])
    if (Date.now() - ts < 2 * 60 * 1000) return false // wait 2 min before retrying
  }

  if (!supabase) { localStorage.setItem(LS_KEY, `false:${Date.now()}`); return false }

  // Use a HEAD request via supabase client — minimises payload
  const { error, status } = await supabase.from('feeds').select('id').limit(0)
  const ready = !error && status < 400
  localStorage.setItem(LS_KEY, ready ? 'true' : `false:${Date.now()}`)
  return ready
}

export async function dbLoadFeeds(): Promise<Feed[]> {
  if (!supabase || !(await tablesExist())) return []
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('config')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(r => r.config as Feed)
  } catch (e) {
    console.warn('[Supabase] loadFeeds:', e)
    return []
  }
}

export async function dbUpsertFeed(feed: Feed): Promise<void> {
  if (!supabase || !(await tablesExist())) return
  try {
    const { error } = await supabase.from('feeds').upsert({
      id: feed.id,
      name: feed.name,
      config: feed,
      created_at: feed.createdAt,
    })
    if (error) throw error
  } catch (e) {
    console.warn('[Supabase] upsertFeed:', e)
  }
}

export async function dbDeleteFeed(id: string): Promise<void> {
  if (!supabase || !(await tablesExist())) return
  try {
    const { error } = await supabase.from('feeds').delete().eq('id', id)
    if (error) throw error
  } catch (e) {
    console.warn('[Supabase] deleteFeed:', e)
  }
}

export async function dbLoadItems(feedId: string): Promise<{ items: AnyFeedItem[]; fetchedAt: number | null }> {
  if (!supabase || !(await tablesExist())) return { items: [], fetchedAt: null }
  try {
    const [itemsRes, feedRes] = await Promise.all([
      supabase.from('feed_items').select('data').eq('feed_id', feedId),
      supabase.from('feeds').select('last_fetched_at').eq('id', feedId).single(),
    ])
    const items = (itemsRes.data ?? []).map(r => r.data as AnyFeedItem)
    const fetchedAt: number | null = feedRes.data?.last_fetched_at ?? null
    return { items, fetchedAt }
  } catch (e) {
    console.warn('[Supabase] loadItems:', e)
    return { items: [], fetchedAt: null }
  }
}

export async function dbSaveItems(feedId: string, items: AnyFeedItem[]): Promise<void> {
  if (!supabase || !(await tablesExist())) return
  try {
    await supabase.from('feed_items').delete().eq('feed_id', feedId)
    if (items.length > 0) {
      for (let i = 0; i < items.length; i += 500) {
        const batch = items.slice(i, i + 500)
        const { error } = await supabase
          .from('feed_items')
          .insert(batch.map(item => ({ feed_id: feedId, data: item })))
        if (error) throw error
      }
    }
    await supabase.from('feeds').update({ last_fetched_at: Date.now() }).eq('id', feedId)
  } catch (e) {
    console.warn('[Supabase] saveItems:', e)
  }
}
