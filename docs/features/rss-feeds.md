# RSS Feed System

Free, unlimited content delivery via YouTube RSS feeds.

---

## Overview

YouTube provides RSS feeds for every channel at:

```
https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
```

Each feed contains the ~15 most recent uploads with metadata. This is:
- **Free** — no API key, no account, no billing
- **Unlimited** — no daily quota, no rate limit
- **Reliable** — official YouTube endpoint, rarely changes
- **Rich** — includes title, description, thumbnail, views, publish date

---

## Architecture

```
9 YouTube Channels
      │
      │  (Promise.allSettled)
      │
      ▼
/api/feed (server)
  ├── Cache check (5-min TTL)
  ├── Fetch + parse RSS feeds
  ├── Classify videos
  ├── Filter by category
  └── Return JSON
      │
      ▼
use-youtube-feed (client)
  ├── Sort (latest/trending)
  ├── Paginate (12/page)
  └── Auto-refresh (10 min)
```

---

## Files

| File | Role |
|---|---|
| `src/lib/youtube-rss.ts` | RSS fetcher + XML parser |
| `src/app/api/feed/route.ts` | Server-side aggregation endpoint |
| `src/hooks/use-youtube-feed.ts` | Client-side data hook |
| `src/config/channels.ts` | Channel configuration |

---

## RSS Feed Format

A YouTube RSS feed returns XML like this:

```xml
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <id>yt:video:VIDEO_ID</id>
    <yt:videoId>VIDEO_ID</yt:videoId>
    <yt:channelId>CHANNEL_ID</yt:channelId>
    <title>Video Title Here</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO_ID"/>
    <author><name>Channel Name</name></author>
    <published>2025-05-06T12:00:00+00:00</published>
    <updated>2025-05-06T13:00:00+00:00</updated>
    <media:group>
      <media:title>Video Title Here</media:title>
      <media:description><![CDATA[Full description with HTML tags]]></media:description>
      <media:thumbnail url="https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg"/>
      <media:content url="https://www.youtube.com/v/VIDEO_ID"/>
      <media:statistics views="1500000"/>
    </media:group>
  </entry>
</feed>
```

### Fields Extracted

| XML Path | Mapped To | Notes |
|---|---|---|
| `<yt:videoId>` | `video.videoId` | Required |
| `<title>` / `<media:title>` | `video.title` | HTML entities decoded |
| `<published>` | `video.publishedAt` | ISO 8601 |
| `<media:description>` | `video.description` | CDATA stripped, HTML removed |
| `<media:thumbnail>` `url=` attr | `video.thumbnailUrl` | High quality |
| `<media:statistics>` `views=` attr | `video.viewCount` | Integer parsed |
| `<author><name>` | `video.channelName` | From channel config, not XML |

### Fields NOT Available from RSS

The RSS feed does NOT provide:
- **Like count** — not in `<media:statistics>`
- **Comment count** — not in `<media:statistics>`
- **Duration** — would require an additional API call
- **Subscriber count** — per-channel metadata not in video RSS

These fields default to `0` / empty string in the Video type.

---

## XML Parser Implementation

The parser in `youtube-rss.ts` uses string operations instead of an XML library:

```typescript
function extractTag(xml: string, tag: string): string {
  const startIdx = xml.indexOf(tag);
  const valueStart = startIdx + tag.length;
  const endIdx = xml.indexOf('</', valueStart);
  return xml.substring(valueStart, endIdx).trim();
}
```

This approach was chosen because:
- Zero dependencies (no `xml2js`, `fast-xml-parser`, etc.)
- Fast for the small, well-structured YouTube RSS format
- No risk of parser-injection vulnerabilities
- Works identically in Node.js (server) and browser (edge)

The feed is split by `<entry>` tags, then each block is parsed independently. Failed entries are skipped silently.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Channel RSS fetch fails | Silently skipped, other channels still work |
| Channel RSS is empty | Returns empty array for that channel |
| XML parse fails mid-entry | Entry skipped, parsing continues |
| All channels fail | Returns `videos: []`, client falls back to mock data |
| Timeout (>10s per channel) | Channel skipped via AbortSignal |

The `Promise.allSettled()` pattern ensures one channel's failure never blocks the rest.

---

## Adding a New Channel

See [Channels Configuration](../configuration/channels.md) for the full guide. The short version:

1. Find the YouTube channel ID (from the channel URL)
2. Add an entry to `TRUSTED_CHANNELS` in `src/config/channels.ts`:

```typescript
{ id: 'UC_NEW_CHANNEL_ID', name: 'Channel Name', category: 'football', priority: 10 }
```

3. Deploy — the new channel is automatically included in the next RSS fetch.

---

## Caching

Server-side in-memory cache in `/api/feed/route.ts`:

```
feed_All         → all videos, 5-min TTL
feed_Football    → football videos, 5-min TTL
feed_Basketball  → basketball videos, 5-min TTL
...
```

The cache lives in the Workers global scope, so it persists across requests within the same isolate. When the isolate is recycled (cold start), the cache is empty and feeds are fetched fresh.

There is no persistent cache (no KV, no R2) — the 5-minute TTL is sufficient because:
- RSS feeds update infrequently (channels post a few videos per day)
- Fetching 9 RSS feeds in parallel takes ~2-3 seconds
- Mock data fallback handles any edge case
