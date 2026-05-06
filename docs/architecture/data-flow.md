# Data Flow

End-to-end request lifecycle, component hierarchy, and state management patterns.

---

## Request Lifecycle

### Page Load (First Visit)

```
Browser                              Server (Cloudflare Workers)
  │                                       │
  │  GET /                                │
  │──────────────────────────────────────▶│
  │                                       │  Serve static HTML (SSG)
  │  HTML + JS bundle                     │
  │◀──────────────────────────────────────│
  │                                       │
  │  React hydrates                       │
  │  AuthProvider initializes             │
  │  onAuthStateChanged() fires           │
  │                                       │
  │  use-youtube-feed fires                │
  │  GET /api/feed?category=All           │
  │──────────────────────────────────────▶│
  │                                       │  Check cache → MISS
  │                                       │  Fetch 9 RSS feeds in parallel
  │                                       │  Parse XML, classify, cache
  │  { videos: [...], source: 'rss' }     │
  │◀──────────────────────────────────────│
  │                                       │
  │  Video grid renders                   │
  │  use-history loads local cache        │
  │                                       │
  │  If user is signed in:                │
  │  GET Firestore watch history          │
  │  (client → Firebase directly)         │
  │                                       │
  │  Page fully interactive               │
```

### Subsequent Visits (Cached)

```
Browser                              Server (Cloudflare Workers)
  │                                       │
  │  GET /api/feed?category=All           │
  │──────────────────────────────────────▶│
  │                                       │  Check cache → HIT (5 min TTL)
  │  { videos: [...], source: 'rss-cached' }
  │◀──────────────────────────────────────│
  │                                       │
  │  Instant response, no RSS fetching    │
```

---

## Component Hierarchy

```
RootLayout (layout.tsx)
│
├── ThemeProvider (next-themes)
│   └── AuthProvider (auth-context.tsx)
│       └── Home (page.tsx)
│           │
│           ├── Header (inline in page.tsx)
│           │   ├── Logo (Zap icon + "Super Bulls")
│           │   ├── RefreshCw button
│           │   ├── Sun/Moon toggle
│           │   └── [Signed In?]
│           │       ├── UserMenu (dropdown)
│           │       │   ├── Profile (disabled)
│           │       │   ├── API Keys
│           │       │   └── Sign Out
│           │       └── Sign In button
│           │
│           ├── FeedTabs (Latest / Trending / History)
│           ├── CategoryFilter (sport pills)
│           │
│           ├── [Feed View]
│           │   ├── VideoCard × N (grid)
│           │   ├── Loading: VideoCardSkeleton × 6
│           │   ├── Empty: "No watch history"
│           │   └── End: "You've seen all..."
│           │
│           ├── [Detail View]
│           │   └── VideoPlayer
│           │       ├── Back button + title bar
│           │       ├── YouTube iframe (lazy)
│           │       ├── Video stats (views, likes, comments)
│           │       ├── Description (expandable)
│           │       ├── "Watch on YouTube" CTA
│           │       └── Related Videos (VideoCard × 6)
│           │
│           ├── SignInDialog (modal, when open)
│           ├── ApiKeysDialog (modal, when open)
│           └── FooterAdBar (fixed bottom)
```

---

## State Flow by Feature

### Feed State

```
page.tsx
  │
  ├── activeTab: 'latest' | 'trending' | 'history'
  ├── activeCategory: 'All' | 'Football' | 'Basketball' | ...
  └── useYouTubeFeed({ category, sort })
        │
        ├── fetchFeed() ──► /api/feed?category=...
        ├── allVideos: Video[]     (full unpaginated list)
        ├── page: number           (pagination counter)
        ├── pageVideos = allVideos.slice(0, page * 12)
        ├── loading: boolean
        ├── error: string | null
        └── refresh()              (increments refreshKey)
```

### Auth State

```
AuthProvider (auth-context.tsx)
  │
  ├── user: User | null           (Firebase Auth user)
  ├── loading: boolean            (true during initial check)
  │
  ├── signInWithEmail(email, pw)
  ├── signUpWithEmail(email, pw)
  ├── signInWithGoogle()
  └── signOut()

Consumed by:
  ├── page.tsx        → Show Sign In / UserMenu
  ├── use-history.ts  → Sync to Firestore when user present
  └── ApiKeysDialog   → CRUD user's API keys
```

### Watch History State

```
use-history.ts
  │
  ├── history: Video[]
  ├── user (from AuthContext)
  │
  ├── Load strategy:
  │   ├── [Signed in]  → getWatchHistory(userId) from Firestore
  │   │                  Seed local cache if empty (offline support)
  │   └── [Anonymous]  → loadHistoryFromCache() → IndexedDB → history.json
  │
  ├── addToHistory(video):
  │   ├── Always: cache.addToHistory(video) (local)
  │   └── If signed in: saveWatchHistory(uid, video) (Firestore)
  │
  └── clearHistory():
      ├── cache.clear() (local)
      └── If signed in: clearFirestoreHistory(uid) (Firestore)
```

### View Navigation State

```
page.tsx
  │
  ├── currentView: 'feed' | 'detail'
  ├── selectedVideo: Video | null
  │
  ├── handleVideoClick(video):
  │   ├── setSelectedVideo(video)
  │   ├── setCurrentView('detail')
  │   └── addToHistory(video)
  │
  └── handleBack():
      ├── setCurrentView('feed')
      └── setSelectedVideo(null)
```

---

## Data Types

### Video (Core Type)

Defined in `src/lib/mock-data.ts`, used everywhere:

```typescript
interface Video {
  videoId: string;        // YouTube video ID
  title: string;          // Video title
  channelName: string;    // Channel display name
  channelId: string;      // YouTube channel ID
  thumbnailUrl: string;   // Thumbnail image URL
  publishedAt: string;    // ISO 8601 publish date
  description: string;    // Video description
  viewCount: number;      // View count from RSS
  likeCount: number;      // Like count (0 from RSS, available via legacy API)
  commentCount: number;   // Comment count (0 from RSS, available via legacy API)
  duration: string;       // Duration string (empty from RSS)
  category: string;       // Sport category (classified by keyword matching)
}
```

### FeedTab

```typescript
type FeedTab = 'latest' | 'trending' | 'history';
```

### CategoryRule

```typescript
interface CategoryRule {
  name: string;           // Display name (e.g., 'Football')
  keywords: string[];     // Matching keywords
  icon: string;           // Lucide icon name
}
```
