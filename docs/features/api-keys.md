# API Key Management

Per-user API key storage synced across devices via Firestore.

---

## Overview

The API Keys feature allows signed-in users to store their YouTube Data API v3 key. This enables server-side API calls using the user's own quota, keeping keys out of the codebase and environment variables.

> **Note:** The current RSS-based feed system does not require an API key. This feature exists for future use cases where server-side YouTube API calls are needed (e.g., fetching video duration, full stats, or search).

---

## Files

| File | Role |
|---|---|
| `src/lib/firestore-secrets.ts` | Firestore CRUD for user API keys |
| `src/components/api-keys-dialog.tsx` | UI dialog for managing keys |
| `src/components/auth/user-menu.tsx` | Entry point (User Menu → API Keys) |

---

## Firestore Structure

```
users/{userId}/secrets/{keyName}
  ├── key: string          // e.g., "NEXT_PUBLIC_YOUTUBE_API_KEY"
  ├── value: string        // The actual API key
  └── updatedAt: Timestamp // Server timestamp
```

Each secret is a document keyed by its name. Currently only one key is managed:

| Key Name | Purpose |
|---|---|
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API v3 key for server-side calls |

---

## UI Flow

```
User Menu (dropdown)
  └── API Keys
        └── ApiKeysDialog (modal)
              ├── Input field (password-type, toggleable)
              ├── Show/hide key button
              ├── "Save Key" button
              ├── "Delete" button (if key exists)
              └── Cancel button
```

### Dialog States

| State | UI |
|---|---|
| Loading | Spinner (while fetching current key from Firestore) |
| Empty | Empty input field with placeholder |
| Has Key | Shows masked key, delete button visible |
| Saving | Button shows spinner, disabled |
| Deleting | Delete button shows spinner, disabled |

---

## Firestore Security

Keys are stored per-user with Firestore rules enforcing isolation:

```
match /users/{userId}/secrets/{secretId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
}
```

- Only the owning user can read/write their keys
- No cross-user access is possible
- Keys are never stored in environment variables or the codebase

---

## API

```typescript
// Save an API key
await saveApiKey(userId, 'NEXT_PUBLIC_YOUTUBE_API_KEY', 'AIzaSy...');

// Get all API keys for a user
const keys = await getApiKeys(userId);
// Returns: { NEXT_PUBLIC_YOUTUBE_API_KEY: 'AIzaSy...' }

// Delete an API key
await deleteApiKey(userId, 'NEXT_PUBLIC_YOUTUBE_API_KEY');
```

All functions are in `src/lib/firestore-secrets.ts` and use the Firebase client SDK (not Admin SDK). They must be called from the client side with an authenticated user.

---

## Future Use Cases

The stored API key could power:
- **Video duration** — Fetch via `videos.list?part=contentDetails`
- **Full stats** — Like count, comment count (not available from RSS)
- **Search** — YouTube search API for broader content discovery
- **Channel stats** — Subscriber counts for quality filtering

These would be implemented as server-side API routes that read the user's key from Firestore using the Firebase Admin SDK (not yet implemented).
