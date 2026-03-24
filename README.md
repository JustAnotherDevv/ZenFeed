# ZenFeed

**Personalized AI feed aggregator with real-time web extraction and a voice companion.**

ZenFeed lets you describe what you want to track in plain language — _"find active web3 hackathons with prizes"_ or _"Show me list of events happening in London this month"_ — and instantly generates a live, structured feed from the open web. A hands-free voice companion reads your feed aloud and accepts spoken commands to search, filter, and mutate feeds in real time.

Built for the **Firecrawl × ElevenLabs hackathon**.

---

## How It Works

### Feed Creation — Natural Language → Structured Search

You describe what you want. ZenFeed uses **OpenRouter (Gemini 2.0 Flash Lite)** to parse your description into a structured config: positive keywords, negative keywords, and feed type. No keyword entry, no dropdowns — just speak or type.

For event/hackathon feeds it goes further: the AI generates **5 targeted search queries** specific to the topic, including `site:` prefixes for known platforms (devpost.com, dorahacks.io, ethglobal.com, gitcoin.co, buidlbox.io), then runs them all in parallel.

### Event Extraction — Two-Phase Firecrawl Pipeline

For discovery feeds (hackathons, competitions, grants):

**Phase 1 — Parallel search.** All 5 generated queries hit Firecrawl `/v1/search` simultaneously. Results are merged and deduped by URL (~25 unique candidates).

**Phase 2 — Scrape + AI analysis.** Each URL is scraped via Firecrawl `/v1/scrape` (markdown format — fast, no Firecrawl LLM overhead). The markdown is sent to OpenRouter with a prompt that includes the user's original intent, today's date, and explicit date-based status rules. The AI returns structured JSON: name, prizes, deadline, start/end dates, organizer, location, status, and a reasoning field explaining its decision.

**Filtering.** Events are discarded if they don't match the user's intent (a poetry contest when you asked for web3 hackathons), if their deadline has passed, or if they hit negative keywords. A hard date check backstops the AI.

**List page expansion.** If a URL is an aggregator, the AI extracts up to 30 individual event URLs and crawls each one in a follow-up batch — no hard cap on results.

### News Feeds — Live Search with Freshness Control

Standard feeds use Firecrawl `/v1/search` with configurable freshness (24h / week / month), post-filtered by negative keywords on title and summary.

### Voice Companion — ElevenLabs Conversational Agent

The voice orb connects to an **ElevenLabs conversational AI agent** over WebRTC via `@elevenlabs/react`. On every session start, the agent receives live context: current feed name, keywords, item count, and titles/summaries of the top 5 items.

Three client tools are registered that give the agent real capabilities — not just answers:

| Tool                    | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `searchMore(query)`     | Triggers a new Firecrawl search, appends results to the current feed |
| `addTopicToFeed(topic)` | Adds a keyword to the active feed and re-fetches                     |
| `openArticle(index)`    | Highlights and scrolls to a card by index                            |

Say _"summarize my feed"_, _"add DeFi to my topics"_, or _"open article 3"_ — it responds and acts.

---

## Features

- Natural language feed creation with mic input (Web Speech API) and AI parsing
- Two feed types: **News** (live article search) and **Discovery** (structured event extraction)
- Smart event cards with prizes, deadlines with countdown, organizer, location, status chip
- **Stats bar**: combined prize pool, active/upcoming counts, city breakdown, next deadline
- **Sort by**: deadline ascending/descending, start date, end date, biggest prize
- **List and grid views** for event feeds
- **Extraction debug panel**: every URL processed, AI reasoning, accept/discard decision, all generated queries visible
- Duplicate detection: by URL and by event identity (same name + deadline from multiple sources)
- Rate-limit handling: batched scraping (3 concurrent), exponential backoff on 429s
- Pull-to-refresh and manual refresh
- Persistent feeds via Zustand + localStorage; ephemeral cache rebuilt on each load

---

## Tech Stack

| Layer                          | Technology                                   |
| ------------------------------ | -------------------------------------------- |
| Web scraping & search          | **Firecrawl** `/v1/search` + `/v1/scrape`    |
| Voice companion                | **ElevenLabs** Conversational Agent (WebRTC) |
| AI analysis & query generation | **OpenRouter** — Gemini 2.0 Flash Lite       |
| Frontend                       | React 19 + Vite + TypeScript                 |
| Styling                        | Tailwind CSS v4 + shadcn/ui                  |
| State                          | Zustand with persist middleware              |

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
```

The app runs fully on mock data without API keys. With keys, all three services activate automatically.

**Getting keys:**

- Firecrawl — [firecrawl.dev](https://firecrawl.dev)
- ElevenLabs — create a Conversational Agent at [elevenlabs.io](https://elevenlabs.io), copy the agent ID
- OpenRouter — [openrouter.ai](https://openrouter.ai) · Gemini 2.0 Flash Lite costs ~$0.075 / 1M tokens

---

## Firecrawl Usage

ZenFeed uses Firecrawl as its core data layer — not just for simple search, but as a full extraction engine:

- **`/v1/search`** — parallel multi-query search with freshness control and per-query result limits. Five targeted queries run simultaneously and results are merged.
- **`/v1/scrape`** — markdown extraction for AI analysis. Every event candidate URL is scraped individually, in rate-limited batches, with retry logic on 408/429 responses.

The two-phase pipeline (search → scrape → AI analyze) is what produces structured, verified event data instead of raw links. Firecrawl handles fetching and cleaning content from arbitrary web pages so the AI only has to classify and extract.

---

## ElevenLabs Usage

ZenFeed uses ElevenLabs' **Conversational AI agent** (not the TTS API) via `@elevenlabs/react`. The agent runs over WebRTC for sub-second voice response latency with full duplex audio.

Live feed context is injected as dynamic variables on every session start, so the agent always knows what you're currently looking at. Registered client tools give it real agency — it can mutate your feeds and trigger fresh Firecrawl searches mid-conversation.

---

## Pipeline Architecture

```
User input (text or voice)
        │
        ▼
parseFeedDescription()  →  OpenRouter: description → {keywords, negativeKeywords, feedType}
        │
        ▼
generateSearchQueries()  →  OpenRouter: intent → 5 targeted search queries
        │
        ▼
runParallelSearches()  →  Firecrawl /v1/search ×5  →  ~25 unique candidate URLs
        │
        ▼
batchAll(processUrl, 3)
  ├─ Firecrawl /v1/scrape  →  markdown
  └─ OpenRouter analysis   →  {status, deadline, prizes, location, isEvent, reasoning}
        │
        ▼
Filter: ended events · irrelevant topics · negative keywords
Dedupe: by URL + by event identity (name + deadline)
Sort:   deadline / start date / end date / prize amount
        │
        ▼
FeedView  →  EventStatsBar + EventsToolbar + EventCard (list or grid)
        │
        ▼
ElevenLabs agent  →  reads feed · searchMore · addTopicToFeed · openArticle
```
