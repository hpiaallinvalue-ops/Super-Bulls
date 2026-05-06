# Channel Configuration

Managing YouTube channel sources for the RSS feed.

---

## Overview

Channels are configured in `src/config/channels.ts`. Each entry defines a YouTube channel to fetch content from. Adding, removing, or reordering channels is a one-line change.

---

## Channel List

| Priority | Name | Channel ID | Category | Status |
|---|---|---|---|---|
| 1 | ESPN | `UCiiljEMOGL7SUhPCrCO-MOg` | General | Active |
| 2 | Sky Sports | `UCDjFJ-YdsJ3VT2zBOPOdqeA` | Football | Active |
| 3 | Bleacher Report | `UC8-ZWfFvkRnN2Lfl8fFbK0A` | General | Active |
| 4 | NBA | `UCWJ2lWNubArHWmf3FIHbfcQ` | Basketball | Active |
| 5 | UFC | `UCvgfXK4aHYobs0s2FhW6pNg` | MMA | Active |
| 6 | Fox Sports | `UCqZQJ4D8bqG5wjNEiH7kyCQ` | General | Active |
| 7 | CBS Sports Golazo | `UCs-dSOHbA_J4p76uYIUczWg` | Football | Active |
| 8 | DAZN Boxing | `UCAYlEoYwWfkF9nx3GekMwiw` | MMA | Active |
| 9 | The Athletic | `UCFtK9FVk8cXihz9MW4SVy7w` | General | Active |

---

## Channel Interface

```typescript
interface ChannelInfo {
  id: string;       // YouTube channel ID (UC...)
  name: string;     // Display name
  category: string; // Primary sport category
  priority: number; // Lower = fetched first (for ordering)
}
```

### `id` — YouTube Channel ID

The unique identifier for a YouTube channel. Format: `UC` followed by 22 alphanumeric characters.

**How to find a channel ID:**
1. Go to the YouTube channel page
2. Check the URL: `youtube.com/channel/UC...` — the `UC...` part is the ID
3. If the URL uses a custom handle (`youtube.com/@ESPN`), view the page source and search for `"channelId"`

### `name` — Display Name

The human-readable name shown in the UI (channel avatars, fallback text). Must match the actual YouTube channel name for consistency.

### `category` — Primary Sport Category

The default classification for videos from this channel. Used by `CHANNEL_CATEGORY_MAP` in `channels.ts`. Values must match a category in `categories.ts`:
- `general` — Multi-sport (ESPN, Bleacher Report, Fox Sports)
- `football` — Soccer (Sky Sports, CBS Sports Golazo)
- `basketball` — NBA, NCAA
- `mma` — UFC, Boxing
- `cricket` — IPL, international
- `tennis` — ATP, WTA, Grand Slams
- `baseball` — MLB
- `Other` — Everything else

Note: This is a **pre-classification hint**, not final. The `category-rules.ts` keyword matcher overrides this based on the video's actual title and description.

### `priority` — Feed Ordering

Lower numbers appear first in the merged feed when videos have the same timestamp. In practice, all channels are fetched in parallel (`Promise.allSettled`), so priority only affects the final merge order.

---

## Adding a New Channel

1. Open `src/config/channels.ts`
2. Add an entry to the `TRUSTED_CHANNELS` array:

```typescript
{ id: 'UC_NEW_CHANNEL_ID', name: 'New Channel', category: 'general', priority: 10 }
```

3. Optionally add to `CHANNEL_CATEGORY_MAP` if the channel is category-specific
4. Deploy — the channel is automatically included in the next RSS fetch

**Example: Adding NFL**

```typescript
// In TRUSTED_CHANNELS:
{ id: 'UCJplwRBCFViEmR5j8H7ig1w', name: 'NFL', category: 'football', priority: 10 }

// In CHANNEL_CATEGORY_MAP:
'UCJplwRBCFViEmR5j8H7ig1w': 'football',
```

---

## Removing a Channel

Delete the corresponding entry from `TRUSTED_CHANNELS`. Also remove from `WHITELISTED_CHANNELS` and `CHANNEL_CATEGORY_MAP` if present.

**Before removing a channel, consider:**
- Will the feed have enough content? (Each channel provides ~15 videos)
- Are there other channels covering the same sports?
- Should you replace it with a similar channel instead?

---

## Limits and Considerations

| Factor | Limit | Notes |
|---|---|---|
| Channels per fetch | Unlimited | All fetched in parallel |
| Videos per channel | ~15 | YouTube RSS limit (most recent uploads) |
| Total videos in feed | ~135 | 9 channels × 15 videos |
| Fetch timeout | 10 seconds | Per channel (AbortSignal) |
| Server cache TTL | 5 minutes | Across all channels |

Adding too many channels increases:
- **Fetch time**: More parallel HTTP requests (10s timeout per channel)
- **Memory**: More data in the in-memory cache
- **Cloudflare CPU**: More XML parsing on the Workers runtime

A reasonable upper limit is ~20 channels. Beyond that, consider paginating or prioritizing subsets.
