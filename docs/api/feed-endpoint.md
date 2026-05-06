# Feed Endpoint

`GET /api/feed` — RSS-aggregated video feed with server-side caching.

---

## Endpoint

```
GET /api/feed?category={category}
```

## Response

```json
{
  "videos": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Top 10 Football Goals of the Season",
      "channelName": "ESPN",
      "channelId": "UCiiljEMOGL7SUhPCrCO-MOg",
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "publishedAt": "2025-05-06T10:00:00Z",
      "description": "Watch the most incredible football goals...",
      "viewCount": 2500000,
      "likeCount": 0,
      "commentCount": 0,
      "duration": "",
      "category": "Football"
    }
  ],
  "source": "rss",
  "channels": 9,
  "fetchedFrom": 8
}
```

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `category` | string | No | `All` | Sport category to filter by. Values: `All`, `Football`, `Basketball`, `Cricket`, `MMA`, `Tennis`, `Baseball`, `Other` |

---

## Response Fields

| Field | Type | Description |
|---|---|---|
| `videos` | `Video[]` | Array of video objects. Empty if no videos match the category or all fetches fail. |
| `source` | `string` | `"rss"` (fresh fetch) or `"rss-cached"` (served from server cache) |
| `channels` | `number` | Total channels configured (always 9, for reference) |
| `fetchedFrom` | `number` | Number of channels that returned successful RSS data |

---

## Caching

| Aspect | Detail |
|---|---|
| Cache type | In-memory `Map` (Workers global scope) |
| Cache key | `feed_{category}` (e.g., `feed_Football`) |
| TTL | 5 minutes (300,000 ms) |
| Cold start | Empty cache → full RSS fetch |
| Invalidation | Automatic on TTL expiry |

The `source` field in the response indicates whether the data came from cache or a fresh fetch:
- `"rss-cached"` → served from in-memory cache (fast, ~5ms)
- `"rss"` → freshly fetched from YouTube RSS (slower, ~2-3s)

---

## Error Behavior

| Scenario | HTTP Status | Response |
|---|---|---|
| All channels fail | 200 | `{ videos: [], source: "rss", channels: 9, fetchedFrom: 0 }` |
| Some channels fail | 200 | `{ videos: [...], source: "rss", fetchedFrom: 6 }` (partial data) |
| Invalid category | 200 | `{ videos: [], source: "rss", channels: 9, fetchedFrom: 9 }` (empty filter) |
| Server error | 500 | Internal Server Error (Workers exception) |

The endpoint never returns 4xx errors. Failed channels are silently skipped, and the client falls back to mock data if `videos` is empty.

---

## Implementation

**File:** `src/app/api/feed/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'All';

  // 1. Check cache
  // 2. Fetch RSS from all channels (Promise.allSettled)
  // 3. Parse XML → Video[]
  // 4. Classify by category
  // 5. Filter by requested category
  // 6. Cache + return JSON
}
```

### Channels Fetched

The endpoint fetches from all channels in `src/config/channels.ts` (currently 9). Each fetch has:
- 10-second timeout (`AbortSignal.timeout(10_000)`)
- Custom `Accept` and `User-Agent` headers
- Silent error handling (failed channels don't affect others)

### Classification

Each video is classified using `classifyVideo()` from `src/lib/category-rules.ts`. The classification runs on the server side so the client receives pre-classified data.
