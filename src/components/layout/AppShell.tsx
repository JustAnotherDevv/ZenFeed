import { useState, useRef, useCallback } from "react";
import { useFeedStore } from "@/store/useFeedStore";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useFeedSearch } from "@/hooks/useFeedSearch";
import { FeedTabBar } from "./FeedTabBar";
import { TopBar } from "./TopBar";
import { FeedView } from "@/components/feed/FeedView";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { VoiceTranscript } from "@/components/voice/VoiceTranscript";
import { CreateFeedModal } from "@/components/modals/CreateFeedModal";
import { FeedSettingsModal } from "@/components/modals/FeedSettingsModal";
import { DebugPanel } from "@/components/debug/DebugPanel";

export function AppShell() {
  const feeds = useFeedStore((s) => s.feeds);
  const activeIndex = useFeedStore((s) => s.activeIndex);
  const setActiveIndex = useFeedStore((s) => s.setActiveIndex);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pagerRef = useRef<HTMLDivElement>(null);

  const activeFeed = feeds[activeIndex] ?? null;
  const { status, isSpeaking, toggleSession, endSession } =
    useVoiceAgent(activeFeed);
  const { refresh } = useFeedSearch();
  const isRefreshing = useFeedStore((s) =>
    activeFeed ? s.loadingState[activeFeed.id] === "refreshing" : false,
  );

  const handleRefresh = useCallback(() => {
    if (activeFeed) refresh(activeFeed);
  }, [activeFeed, refresh]);

  const handleTabSelect = useCallback(
    (i: number) => {
      setActiveIndex(i);
      pagerRef.current?.children[i]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    },
    [setActiveIndex],
  );

  const handlePagerScroll = useCallback(() => {
    if (!pagerRef.current) return;
    const scrollLeft = pagerRef.current.scrollLeft;
    const width = pagerRef.current.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, setActiveIndex]);

  return (
    <div className="flex flex-col h-svh bg-background">
      <TopBar
        onAddFeed={() => setCreateOpen(true)}
        onRefresh={activeFeed ? handleRefresh : undefined}
        isRefreshing={isRefreshing}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-background py-3 px-2 gap-1 overflow-y-auto">
          {feeds.map((feed, i) => (
            <button
              key={feed.id}
              onClick={() => handleTabSelect(i)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors truncate ${
                i === activeIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {feed.name}
            </button>
          ))}
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors mt-1 border border-dashed border-border"
          >
            + Add feed
          </button>
        </aside>

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Tab bar — mobile only */}
          <div className="lg:hidden">
            <FeedTabBar feeds={feeds} activeIndex={activeIndex} onSelect={handleTabSelect} />
          </div>

          {/* Feed pager */}
          <div
            ref={pagerRef}
            className="feed-pager flex-1 min-h-0"
            onScroll={handlePagerScroll}
          >
            {feeds.map((feed) => (
              <div key={feed.id} className="feed-page">
                <FeedView feed={feed} />
              </div>
            ))}

            {feeds.length === 0 && (
              <div className="feed-page flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <span className="text-4xl">📡</span>
                </div>
                <h2 className="font-bold text-xl text-foreground mb-2">Create your first feed</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose topics you care about and get a live, personalized stream of articles.
                </p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold text-sm"
                >
                  Create Feed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice */}
      <VoiceOrb status={status} isSpeaking={isSpeaking} onToggle={toggleSession} />
      <VoiceTranscript status={status} isSpeaking={isSpeaking} onClose={endSession} />

      {/* Modals */}
      <CreateFeedModal open={createOpen} onOpenChange={setCreateOpen} />
      <FeedSettingsModal feed={activeFeed} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DebugPanel />
    </div>
  );
}
