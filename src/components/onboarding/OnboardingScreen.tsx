import { useState } from 'react'
import { ArrowRight, Mic, Sparkles, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'

const PRESET_FEEDS = [
  { name: 'VC & Fundraising', keywords: ['Series A', 'venture capital', 'startup funding', 'YC'] },
  { name: 'AI & Tech', keywords: ['artificial intelligence', 'LLM', 'OpenAI', 'machine learning'] },
  { name: 'Fitness', keywords: ['workout', 'nutrition', 'fitness tips', 'health'] },
  { name: 'Crypto', keywords: ['Bitcoin', 'Ethereum', 'DeFi', 'crypto market'] },
]

export function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [feedName, setFeedName] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')
  const store = useFeedStore()
  const { fetchFeed } = useFeedSearch()

  const addKw = () => {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords((p) => [...p, kw])
    setKwInput('')
  }

  const applyPreset = (p: (typeof PRESET_FEEDS)[0]) => {
    setFeedName(p.name)
    setKeywords(p.keywords)
  }

  const createAndContinue = () => {
    if (!feedName.trim() || keywords.length === 0) return
    const id = store.addFeed({ name: feedName.trim(), keywords, freshness: 'qdr:d' })
    const feed = { id, name: feedName.trim(), keywords, freshness: 'qdr:d' as const, createdAt: Date.now() }
    fetchFeed(feed)
    setStep(2)
  }

  const finish = () => {
    store.completeOnboarding()
  }

  return (
    <div className="flex flex-col h-svh bg-background">
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-3 rounded-3xl bg-primary/20 animate-pulse -z-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
            Welcome to ZenFeed
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Your personalized AI news companion. Create custom feeds on any topic and let your voice guide you through the latest.
          </p>
          <Button className="w-full h-14 text-base rounded-2xl" onClick={() => setStep(1)}>
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Powered by Firecrawl + ElevenLabs</p>
        </div>
      )}

      {/* Step 1: Create first feed */}
      {step === 1 && (
        <div className="flex flex-col flex-1 px-6 pt-12 pb-8 overflow-y-auto">
          <h1 className="text-2xl font-bold text-foreground mb-1">Create your first feed</h1>
          <p className="text-muted-foreground text-sm mb-6">Pick a topic you want to track daily.</p>

          {/* Presets */}
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick start</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {PRESET_FEEDS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-2xl border text-left transition-colors text-sm font-medium ${
                  feedName === p.name
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-2">Or customize</p>
          <Input
            placeholder="Feed name"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
            className="mb-3"
          />

          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add keyword, press Enter"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addKw() } }}
            />
            <Button variant="outline" size="icon" onClick={addKw}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="flex items-center gap-1 pr-1">
                  {kw}
                  <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <Button
              className="w-full h-14 text-base rounded-2xl"
              onClick={createAndContinue}
              disabled={!feedName.trim() || keywords.length === 0}
            >
              Create Feed
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Voice setup */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-3 rounded-full bg-primary/20 animate-pulse-ring -z-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Enable voice</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            ZenFeed works hands-free. Your AI voice companion can read your feed, answer questions, and update your topics — just ask.
          </p>
          <p className="text-xs text-muted-foreground bg-muted px-4 py-3 rounded-xl mb-8">
            Try saying: <span className="font-medium text-foreground">"Summarize my feed"</span> or <span className="font-medium text-foreground">"Add climate tech to my topics"</span>
          </p>
          <Button className="w-full h-14 text-base rounded-2xl mb-3" onClick={finish}>
            Enable Voice
            <Mic className="ml-2 w-5 h-5" />
          </Button>
          <button onClick={finish} className="text-sm text-muted-foreground">
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}
