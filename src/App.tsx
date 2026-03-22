import { useFeedStore } from '@/store/useFeedStore'
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  const hasCompletedOnboarding = useFeedStore((s) => s.hasCompletedOnboarding)

  return (
    <>
      {hasCompletedOnboarding ? <AppShell /> : <OnboardingScreen />}
      <Toaster position="top-center" richColors />
    </>
  )
}
