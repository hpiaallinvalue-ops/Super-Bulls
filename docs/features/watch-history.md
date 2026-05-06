# Watch History

Local-first watch history with optional cross-device sync via Firestore.

---

## Overview

Watch history tracks which videos a user has viewed. It works in two modes:

| Mode | Storage | Sync | Availability |
|---|---|---|---|
| **Anonymous** | IndexedDB (browser) → localStorage fallback | None | Single device only |
| **Signed In** | IndexedDB + Firestore (cloud) | Cross-device | Synced everywhere |

---

## Files

| File | Role |
|---|---|
| `src/hooks/use-history.ts` | Main hook — manages history state and sync |
| `src/lib/cache.ts` | IndexedDB / localStorage persistence layer |
| `src/lib/firestore-history.ts` | Firestore CRUD for watch history |
| `public/data/history.json` | Static fallback data |

---

## Data Model

### Local (IndexedDB / localStorage)

```typescript
// Cache key: 'video_history'
interface CacheEntry {
  data: Video[];        // Array of watched videos
  timestamp: number;    // When cached
  ttl: number;          // 24 hours for history
}
```

History is stored as a flat array of `Video` objects, limited to 100 entries.

### Firestore (Cloud)

```
users/{userId}/history/{videoId}
  ├── videoId: string
  ├── title: string
  ├── channelName: string
  ├── thumbnailUrl: string
  ├── publishedAt: string
  └── watchedAt: Timestamp   // Server timestamp
```

Each video is a document keyed by its `videoId`. This allows:
- Upsert on re-watch (updates `watchedAt`)
- O(1) lookup per video
- Simple deletion by document ID

---

## Hook API

```typescript
const { history, addToHistory, clearHistory } = useHistory();

// history: Video[] — current list of watched videos (sorted by recency)
// addToHistory(video): Promise<void> — add a video to history
// clearHistory(): Promise<void> — clear all history
```

---

## Behavior Details

### Loading History

```
use-history.ts → useEffect on mount + user change
  │
  ├── [Signed in]
  │   ├── getWatchHistory(userId) from Firestore
  │   ├── On success: setHistory(videos)
  │   │   ├── Seed local cache if empty (offline support)
  │   └── On failure: fallback to loadHistoryFromCache()
  │
  └── [Anonymous]
      ├── cache.getHistory() from IndexedDB
      ├── On empty: load /data/history.json, seed cache
      └── Return local history
```

The `prevUserIdRef` prevents re-fetching when the user hasn't changed:
```typescript
if (userId === prevUserIdRef.current && initialLoadDoneRef.current) return;
```

### Adding to History

```
addToHistory(video)
  │
  ├── Always: cache.addToHistory(video)
  │   ├── Deduplicate by videoId (move to top)
  │   ├── Unshift (newest first)
  │   └── Slice to 100 entries (24h TTL)
  │
  ├── If signed in:
  │   └── saveWatchHistory(userId, { videoId, title, channelName, thumbnailUrl, publishedAt })
  │       └── setDoc in Firestore (upserts by videoId)
  │
  └── Update React state:
      └── setHistory(prev => [video, ...prev.filter(v => v.videoId !== video.videoId)])
```

Errors are silently caught — the app never blocks on history failures.

### Clearing History

```
clearHistory()
  │
  ├── cache.clear() — clears ALL cache (not just history)
  ├── If signed in: clearFirestoreHistory(userId)
  │   └── Batch delete all docs in users/{userId}/history/
  └── setHistory([])
```

---

## Local Cache Layer

`src/lib/cache.ts` provides a three-tier storage system:

| Tier | Technology | When Used |
|---|---|---|
| Primary | IndexedDB (`super-bulls-cache` / `api-cache` store) | Browser with IndexedDB support |
| Fallback | `localStorage` (prefixed with `sb_cache_`) | IndexedDB unavailable or full |
| SSR | In-memory `Map` | Server-side rendering (no browser APIs) |

History uses a dedicated cache key (`video_history`) with a 24-hour TTL. The cache methods:

```typescript
cache.getHistory(): Promise<Video[]>
cache.addToHistory(video: Video): Promise<void>
cache.getHistoryVideoIds(): Promise<string[]>
cache.clear(): Promise<void>
```

---

## Static History Fallback

`public/data/history.json` provides a static seed dataset. It's used when:
- IndexedDB is empty (first visit)
- localStorage is empty
- All dynamic sources fail

The static data includes a sample of mock videos. On first load, these are seeded into the local cache so the "History" tab isn't empty for new users.

---

## Firestore Queries

Watch history is queried with `orderBy('watchedAt', 'desc')` and `limit(100)`. This requires a composite index in Firestore:

```
Collection: users/{userId}/history
Fields: watchedAt (Descending)
```

The index is auto-created on first query. Firestore will show an error link in the Firebase Console logs — click it to create the index automatically.

---

## Offline Behavior

The system is designed for graceful offline degradation:

| Scenario | Behavior |
|---|---|
| No internet + anonymous | Works from local cache (IndexedDB) |
| No internet + signed in | Works from local cache, Firestore writes queued then fail silently |
| Internet restored + signed in | Next `addToHistory` call syncs to Firestore |
| Cold start (SSR) | In-memory cache used, no browser APIs touched |

The local cache is always the primary source of truth for the UI. Firestore is a sync layer, not a dependency.
