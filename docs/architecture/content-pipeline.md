# Content Pipeline

How content flows from YouTube RSS feeds to the user's screen.

---

## Overview

The content pipeline replaced the original YouTube API v3-based system with a free, unlimited RSS approach. The current system is significantly simpler while providing the same user experience.

### Evolution

| Version | Source | Cost | Quota | Channels |
|---|---|---|---|---|
| v1 (legacy) | YouTube Data API v3 | Free | 10K units/day | 5 |
| **v2 (current)** | **YouTube RSS feeds** | **Free** | **Unlimited** | **9** |

The legacy pipeline code (`content-pipeline.ts`, `youtube-api.ts`, `api-quota.ts`) is still in the codebase but no longer used by the main feed hook. It remains available as a fallback and reference.

---

## Current Pipeline: RSS Aggregation

```
YouTube RSS Feeds ──► /api/feed ──► use-youtube-feed ──► page.tsx
     (9 channels)    (server)        (client hook)       (UI)
```

### Step-by-Step Flow

#### 1. RSS Fetch (Server-Side)

**File:** `src/lib/youtube-rss.ts`

Each YouTube channel provides a free RSS feed at:
```
https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
```

The server fetches all 9 channels in parallel using `Promise.allSettled()`:
- Each request has a 10-second timeout
- Failed channels are silently skipped (others still work)
- No API key, no authentication, no rate limiting

#### 2. XML Parsing

**File:** `src/lib/youtube-rss.ts` → `parseRSSFeed()`

The raw XML is parsed with string operations (no external XML library needed):

```
<feed>
  <entry>
    <yt:videoId>abc123</yt:videoId>
    <title>Video Title</title>
    <published>2025-05-06T12:00:00Z</published>
    <media:description><![CDATA[Description...]]></media:description>
    <media:thumbnail url="https://i.ytimg.com/..." />
    <media:statistics views="1500000" />
  </entry>
  ...
</feed>
```

Extracted per video:
| Field | Source | Notes |
|---|---|---|
| `videoId` | `<yt:videoId>` | Required |
| `title` | `<title>` | HTML entities decoded |
| `publishedAt` | `<published>` | ISO 8601 format |
| `description` | `<media:description>` | CDATA stripped, HTML tags removed |
| `thumbnailUrl` | `<media:thumbnail>` | High quality preferred |
| `viewCount` | `<media:statistics>` | Parsed from `views` attribute |

#### 3. Classification

**File:** `src/lib/category-rules.ts`

Each video is classified into a sport category using keyword matching:

```
Title + Description (lowercased)
    │
    ▼
Match against CATEGORY_RULES keywords
    │
    ▼
Highest score wins → Football / Basketball / Cricket / MMA / Tennis / Baseball / Other
```

See [Categories Configuration](../configuration/categories.md) for the full keyword list.

#### 4. Caching

**File:** `src/app/api/feed/route.ts`

Server-side in-memory cache with 5-minute TTL:
- Cache key: `feed_{category}` (e.g., `feed_Football`, `feed_All`)
- Stored in Workers global scope (persists across requests in same isolate)
- Auto-populates the "All" cache when a category-specific request is made

#### 5. Client Delivery

**File:** `src/hooks/use-youtube-feed.ts`

The client hook fetches from `/api/feed?category={category}` and:
- Sorts by publish date (Latest) or view count (Trending)
- Paginates client-side (12 per page, infinite scroll)
- Auto-refreshes every 10 minutes
- Falls back to mock data on any error

---

## Channel Priority

Channels are fetched in parallel, not sequentially. However, the `priority` field in `channels.ts` determines the order they appear in the merged feed when multiple videos share the same timestamp:

| Priority | Channel | Category |
|---|---|---|
| 1 | ESPN | General |
| 2 | Sky Sports | Football |
| 3 | Bleacher Report | General |
| 4 | NBA | Basketball |
| 5 | UFC | MMA |
| 6 | Fox Sports | General |
| 7 | CBS Sports Golazo | Football |
| 8 | DAZN Boxing | MMA |
| 9 | The Athletic | General |

---

## Data Flow Diagram

```
                    ┌─────────────────────────┐
                    │    YouTube (9 channels)  │
                    │  Free RSS Feeds (XML)    │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │    /api/feed (server)    │
                    │                          │
                    │  1. Check cache (5 min)  │
                    │  2. Promise.allSettled(  │
                    │       fetch RSS x 9)     │
                    │  3. parseRSSFeed() × 9   │
                    │  4. classifyVideo() each │
                    │  5. Filter by category   │
                    │  6. Store in cache       │
                    └───────────┬─────────────┘
                                │
                                │  JSON: { videos: Video[] }
                                │
                    ┌───────────▼─────────────┐
                    │  use-youtube-feed (hook)  │
                    │                          │
                    │  • Sort (latest/trending)│
                    │  • Paginate (12/page)    │
                    │  • Auto-refresh (10 min) │
                    │  • Mock fallback         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │      page.tsx (UI)       │
                    │                          │
                    │  • Video grid (FeedTabs) │
                    │  • Category filter       │
                    │  • Infinite scroll       │
                    │  • Video player view     │
                    └─────────────────────────┘
```

---

## Legacy Pipeline (v1 — Not Active)

The original pipeline used the YouTube Data API v3 with a 6-phase system:

1. **Source Acquisition** — Fetch from trusted channels via `search.list` + `videos.list`
2. **Deduplication** — Merge sources, remove duplicates by `videoId`
3. **Quality Gates** — 4-stage filter (channel, views, recency, title quality)
4. **Classification** — Keyword matching → sport category
5. **Ranking** — Weighted score: Views×0.4 + Likes×0.2 + Comments×0.1 + Recency×0.3
6. **Delivery** — Tiered cache with stale-while-revalidate

This code lives in `content-pipeline.ts` and is still importable. It was superseded by the RSS approach because:
- No API key or quota management needed
- More channels can be added without cost
- RSS feeds are more reliable and faster (no search API complexity)
