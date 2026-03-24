import { useEffect } from 'react'
import { useFeedStore } from '@/store/useFeedStore'
import { dbLoadFeeds, dbLoadItems } from '@/lib/supabase'
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  const hasCompletedOnboarding = useFeedStore((s) => s.hasCompletedOnboarding)

  useEffect(() => {
    const loadFromSupabase = async () => {
      const feeds = await dbLoadFeeds()
      if (feeds.length === 0) return

      const store = useFeedStore.getState()
      store.setFeeds(feeds)
      store.completeOnboarding()

      // Load cached items for all feeds in parallel
      await Promise.all(
        feeds.map(async (feed) => {
          const { items, fetchedAt } = await dbLoadItems(feed.id)
          if (items.length > 0) {
            store.setItems(feed.id, items)
            if (fetchedAt) store.setLastFetchedAt(feed.id, fetchedAt)
          }
        })
      )
    }

    loadFromSupabase()
  }, [])

  return (
    <>
      {hasCompletedOnboarding ? <AppShell /> : <OnboardingScreen />}
      <Toaster position="top-center" richColors />
    </>
  )
}
