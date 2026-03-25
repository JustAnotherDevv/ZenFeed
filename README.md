# ZenFeed

**Personalized AI feed aggregator with real-time web extraction, progressive streaming, and a voice companion.**

ZenFeed lets you describe what you want to track in plain language — _"find active web3 hackathons with prizes"_ or _"VC funding rounds this week"_ — and instantly generates a live, structured feed from the open web. Results stream in card by card as they're found. A hands-free voice companion reads your feed aloud and accepts spoken commands to search, filter, and mutate feeds in real time.

Built for the **Firecrawl × ElevenLabs hackathon**.

---

## How It Works

### Feed Creation — Natural Language → Structured Search

You describe what you want. ZenFeed uses **OpenRouter (Gemini 2.0 Flash Lite)** to parse your description into a structured config: positive keywords, negative keywords, and feed type. No keyword entry, no dropdowns — just speak or type. Or skip onboarding entirely and explore four curated public feeds instantly.

For event/hackathon feeds the AI generates **8 targeted search queries** specific to the topic, including `site:` prefixes for 10 known platforms (devpost.com, dorahacks.io, ethglobal.com, gitcoin.co, buidlbox.io, lablab.ai, devfolio.co, mlh.io, unstop.com, taikai.network), plus deadline-urgency, prize-focused, and broad-discovery patterns. For news feeds it generates **4 diverse queries** (broad topic, recent, specific angle, analysis) to maximize source diversity.

### Progressive Streaming — Results Appear Immediately

Events and articles stream into the feed as soon as each batch of URLs is processed — the first card can appear within 5 seconds. A sticky banner shows `"Finding more events… (N found)"` while loading continues in the background. Old cached results stay visible during a refresh; they're only replaced when the first fresh result arrives.

### Event Extraction — Two-Phase Firecrawl Pipeline

For discovery feeds (hackathons, competitions, grants):

**Phase 1 — Parallel search.** All 8 generated queries hit Firecrawl `/v1/search` simultaneously with alternating freshness filters (`qdr:y` / `qdr:m`). Results are merged and deduped by URL (up to 60 unique candidates).

**Phase 2 — Scrape + AI analysis.** Each URL is scraped via Firecrawl `/v1/scrape` (markdown format). The markdown (up to 6000 chars) is sent to OpenRouter with a prompt that includes the user's original intent, today's date, and explicit date-based status rules. The AI returns structured JSON: name, prizes, deadline, start/end dates, organizer, location, status, **tags**, **tech stack**, **team size**, and reasoning.

**Filtering.** Events are discarded if they don't match the user's intent, if their deadline has passed, or if they hit negative keywords.

**List page expansion.** If a URL is an aggregator, the AI extracts up to 35 individual event URLs and crawls each one in a parallel follow-up batch.

**Rate limiting.** A global concurrency semaphore caps simultaneous Firecrawl scrape requests at 2, with exponential backoff on 429s (up to 4 retries, max 15s delay).

### News Feeds — Multi-Query Live Search

News feeds generate 4 diverse queries via AI, run them in parallel via Firecrawl `/v1/search`, merge + dedup results (up to 30 articles), and stream them in via `onProgress` callbacks as each query resolves.

### Supabase Persistence — Cross-Device, Cross-Session

Feeds and cached items are synced to Supabase in the background. On page load the app immediately shows cached data from localStorage (no blank screen), then hydrates from Supabase if available. The Supabase table check is cached in localStorage with a 2-minute retry window so missing tables produce zero console noise.

### Voice Companion — ElevenLabs Conversational Agent

The voice orb connects to an **ElevenLabs conversational AI agent** over WebRTC via `@elevenlabs/react`. On every session start, the agent receives live context: current feed name, keywords, item count, and titles/summaries of the top 5 items.

Three client tools give the agent real capabilities:

| Tool                    | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `searchMore(query)`     | Triggers a new Firecrawl search, appends results to the current feed |
| `addTopicToFeed(topic)` | Adds a keyword to the active feed and re-fetches                     |
| `openArticle(index)`    | Highlights and scrolls to a card by index                            |

Say _"summarize my feed"_, _"add DeFi to my topics"_, or _"open article 3"_ — it responds and acts.

---

## Features

- Natural language feed creation with mic input (Web Speech API) and AI parsing
- **Skip onboarding** — one click loads 4 curated public feeds instantly
- Two feed types: **News** (multi-query live search) and **Discovery** (structured event extraction)
- **Progressive streaming** — cards appear as they're found, not after the full pipeline completes
- Smart event cards with prizes, deadlines with countdown, organizer, location, status chip
- **Rich event metadata**: track tags (DeFi, AI/ML, Gaming), tech stack requirements, team size rules
- **Stats bar**: combined prize pool, active/upcoming counts, city breakdown, next deadline
- **Sort by**: deadline ascending/descending, start date, end date, biggest prize
- List and grid views (2-col mobile, 3-col desktop) for event feeds
- **Extraction debug panel**: every URL processed, AI reasoning, accept/discard decision, all generated queries visible
- Duplicate detection: by URL and by event identity (same name + deadline from multiple sources)
- Feed-type-aware refresh intervals: events cache 4 hours, news 30 minutes
- Cached items persist across sessions via localStorage + Supabase — no blank screen on refresh
- Pull-to-refresh and manual refresh (keeps cached cards visible until new data arrives)

---

## Tech Stack

| Layer                          | Technology                                        |
| ------------------------------ | ------------------------------------------------- |
| Web scraping & search          | **Firecrawl** `/v1/search` + `/v1/scrape`         |
| Voice companion                | **ElevenLabs** Conversational Agent (WebRTC)      |
| AI analysis & query generation | **OpenRouter** — Gemini 2.0 Flash Lite            |
| Persistence                    | **Supabase** (feeds + items) + localStorage cache |
| Frontend                       | React 19 + Vite + TypeScript                      |
| Styling                        | Tailwind CSS v4 + shadcn/ui                       |
| State                          | Zustand with persist middleware                   |

---

## Setup

```bash
npm install
npm run dev
```

Create `.env` in the project root:

```env
VITE_FIRECRAWL_KEY=your_firecrawl_key
VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
VITE_OPENROUTER_KEY=your_openrouter_key

# Optional — enables cross-device persistence
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app runs fully on localStorage without API keys. With keys, all services activate automatically. Supabase is optional — without it, feeds persist in localStorage only.

**Supabase setup** (if using): run the following in your Supabase SQL Editor:

```sql
create table if not exists feeds (
  id text primary key,
  name text not null,
  config jsonb not null,
  last_fetched_at bigint,
  created_at bigint not null
);

create table if not exists feed_items (
  id bigint generated always as identity primary key,
  feed_id text not null references feeds(id) on delete cascade,
  data jsonb not null
);

create index if not exists feed_items_feed_id_idx on feed_items(feed_id);

alter table feeds disable row level security;
alter table feed_items disable row level security;
```

**Getting keys:**

- Firecrawl — [firecrawl.dev](https://firecrawl.dev)
- ElevenLabs — create a Conversational Agent at [elevenlabs.io](https://elevenlabs.io), copy the agent ID
- OpenRouter — [openrouter.ai](https://openrouter.ai) · Gemini 2.0 Flash Lite costs ~$0.075 / 1M tokens
- Supabase — [supabase.com](https://supabase.com) · free tier is sufficient

---

## Firecrawl Usage

ZenFeed uses Firecrawl as its core data layer — not just for simple search, but as a full extraction engine:

- **`/v1/search`** — parallel multi-query search with alternating freshness filters (`qdr:y` / `qdr:m`). Eight targeted queries run simultaneously for events; four for news. Results merged and deduped up to 60 URLs.
- **`/v1/scrape`** — markdown extraction for AI analysis. Every event candidate URL is scraped individually, concurrency-capped at 2 simultaneous requests, with exponential backoff on 429s.

The two-phase pipeline (search → scrape → AI analyze) is what produces structured, verified event data instead of raw links. Firecrawl handles fetching and cleaning content from arbitrary web pages so the AI only has to classify and extract.

---

## ElevenLabs Usage

ZenFeed uses ElevenLabs' **Conversational AI agent** (not the TTS API) via `@elevenlabs/react`. The agent runs over WebRTC for sub-second voice response latency with full duplex audio.

Live feed context is injected as dynamic variables on every session start, so the agent always knows what you're currently looking at. Registered client tools give it real agency — it can mutate your feeds and trigger fresh Firecrawl searches mid-conversation.

---

## Pipeline Architecture

```
User input (text / voice / skip onboarding)
        │
        ▼
parseFeedDescription()  →  OpenRouter: description → {keywords, negativeKeywords, feedType}
        │
        ├─ events ──────────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           ▼
generateSearchQueries()                                  generateNewsQueries()
OpenRouter → 8 targeted queries                          OpenRouter → 4 diverse queries
(site: prefixes, deadline/prize patterns)                (broad, recent, specific, analysis)
        │                                                           │
        ▼                                                           ▼
runParallelSearches()                                    Promise.all(4× /v1/search)
Firecrawl /v1/search ×8, qdr:y/qdr:m alt.               → merge + dedup ≤30 articles
→ merge + dedup ≤60 candidate URLs                       → onProgress per resolved query
        │
        ▼
batchAll(processUrl, 3) — semaphore: max 2 concurrent scrapes
  ├─ Firecrawl /v1/scrape  →  markdown (6000 char truncation)
  └─ OpenRouter analysis   →  {status, deadline, prizes, tags, techStack, teamSize, reasoning}
        │
        ▼ onProgress after every batch of 3  →  cards stream into UI
        │
        ▼
Filter: ended · irrelevant · negative keywords
Dedupe: URL + event identity (name + deadline)
Sort:   deadline / start date / end date / prize amount
        │
        ▼
dbSaveItems()  →  Supabase feed_items (background)
        │
        ▼
FeedView  →  EventStatsBar + EventsToolbar + EventCard (list or grid, tags/techStack chips)
        │
        ▼
ElevenLabs agent  →  reads feed · searchMore · addTopicToFeed · openArticle
```
