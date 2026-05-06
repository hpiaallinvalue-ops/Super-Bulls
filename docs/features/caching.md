# Caching Strategy

Three-tier caching system for fast, resilient content delivery.

---

## Overview

The app uses multiple caching layers to ensure fast load times and resilience:

| Layer | Location | TTL | Purpose |
|---|---|---|---|
| **Server cache** | In-memory `Map` (Workers) | 5 minutes | RSS feed responses |
| **Browser cache** | IndexedDB | 10 minutes | API responses, watch history |
| **Fallback cache** | localStorage | Varies | When IndexedDB unavailable |
| **SSR cache** | In-memory `Map` | Request-scoped | Prevents SSR crashes |

---

## Server-Side Cache

**File:** `src/app/api/feed/route.ts`

```typescript
const feedCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### How It Works

1. Request arrives at `/api/feed?category=All`
2. Check `feedCache.get('feed_All')`
3. If cache hit AND not expired → return cached response immediately
4. If cache miss → fetch RSS feeds, parse, classify, store in cache, return

### Cache Keys

| Key | Content |
|---|---|
| `feed_All` | All videos from all channels |
| `feed_Football` | Football-classified videos |
| `feed_Basketball` | Basketball-classified videos |
| `feed_MMA` | MMA-classified videos |
| ... | One per category |

### Lifecycle

- **Created**: On first request after cold start
- **Updated**: On first request after TTL expires
- **Invalidated**: When Workers isolate is recycled (no persistent cache)
- **Size**: Approximately 50-150KB per category (9 channels × ~15 videos × ~500 bytes each)

### Design Decision: No Persistent Cache

The app intentionally does NOT use Cloudflare KV or R2 for persistent caching because:
- RSS feeds update frequently (channels post throughout the day)
- The server-side fetch is fast (~2-3 seconds for 9 channels)
- Mock data fallback handles any failure
- Persistent cache would require managing invalidation

---

## Browser-Side Cache

**File:** `src/lib/cache.ts`

### IndexedDB (Primary)

```typescript
const DB_NAME = 'super-bulls-cache';
const STORE_NAME = 'api-cache';
```

IndexedDB is the primary browser storage. It supports:
- Larger storage limits (typically 50MB+)
- Asynchronous operations (non-blocking)
- Structured data storage (Map-like)

### localStorage (Fallback)

When IndexedDB is unavailable (private browsing, full quota, SSR):
- Keys are prefixed with `sb_cache_`
- Values are JSON-serialized `CacheEntry` objects
- 5MB limit applies (per origin)

### Cache Entry Format

```typescript
interface CacheEntry<T> {
  data: T;           // The cached data
  timestamp: number; // When cached (Date.now())
  ttl: number;       // Time-to-live in milliseconds
}
```

### Cache Keys Used

| Key | TTL | Content |
|---|---|---|
| `video_history` | 24 hours | Watched videos array |
| `pipeline_all_p1_latest` | 8 minutes | Legacy pipeline results |
| `pipeline_Football_p1_trending` | 8 minutes | Legacy pipeline results (category-specific) |

---

## SSR Safety

**Files:** `src/lib/cache.ts`, `src/lib/api-quota.ts`

Cloudflare Workers do not provide `window`, `indexedDB`, or `localStorage`. Both files guard browser API access:

```typescript
const isBrowser = typeof window !== 'undefined';

// In cache.ts:
async get<T>(key: string): Promise<T | null> {
  if (!isBrowser) {
    // Use in-memory Map for SSR
    const entry = memoryStore.get(key);
    return entry?.data ?? null;
  }
  // ... normal IndexedDB flow
}

// In api-quota.ts:
function loadState(): QuotaState {
  if (!isBrowser) return createFreshState();
  // ... normal localStorage flow
}
```

---

## Stale-While-Revalidate

The client-side hook (`use-youtube-feed.ts`) implements a soft refresh pattern:

```typescript
// Auto-refresh every 10 minutes
useEffect(() => {
  const interval = setInterval(() => {
    fetchFeed(true); // isRefresh = true → no loading spinner
  }, 10 * 60 * 1000);
  return () => clearInterval(interval);
}, [fetchFeed]);
```

When `isRefresh` is `true`:
- Current data remains visible (no loading state)
- New data replaces old data when fetch completes
- If fetch fails, old data is preserved

This creates a seamless experience where the feed updates silently in the background.

---

## Cache Invalidation

| Trigger | Effect |
|---|---|
| Server cache TTL expires (5 min) | Next request fetches fresh RSS |
| User switches category | Different cache key, may be fresh or stale |
| User refreshes (pull-to-refresh) | Resets refreshKey, forces re-fetch |
| App cold start | All caches empty, fresh fetch |
| `cache.clear()` called | All local cache cleared (history, API responses) |
| User signs out | Local cache retained (history still works offline) |

---

## Performance Characteristics

| Metric | Value |
|---|---|
| Server cache hit response time | ~5ms (in-memory Map lookup) |
| Server cache miss + RSS fetch | ~2-3 seconds (9 parallel requests) |
| Browser cache hit (IndexedDB) | ~1-2ms |
| Browser cache hit (localStorage) | <1ms |
| Full page load (cold start) | ~3-4 seconds |
| Subsequent page loads (cached) | ~100-200ms |
