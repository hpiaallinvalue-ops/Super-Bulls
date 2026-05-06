# Environment Variables

Configuration and secrets for the Super Bulls application.

---

## Overview

The current application is designed to work with **zero required environment variables**. The RSS-based feed system doesn't need API keys, and Firebase config is embedded in the client bundle.

---

## Required Variables

None. The app works out of the box with a clean `git clone && npm install && npm run dev`.

---

## Optional Variables

| Variable | Purpose | Default | Where Used |
|---|---|---|---|
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API v3 key | Empty (not needed) | `src/lib/youtube-api.ts` (legacy, not active) |

This variable was used by the legacy YouTube API pipeline. It's no longer needed for the RSS-based feed. It's kept in `youtube-api.ts` for backward compatibility if the legacy pipeline is ever re-activated.

---

## Firebase Configuration

Firebase config is embedded directly in `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDMeg7Ihc4L0oVqyFuB1Ebej4itBawH-lM",
  authDomain: "super-bull-32d3e.firebaseapp.com",
  projectId: "super-bull-32d3e",
  storageBucket: "super-bull-32d3e.firebasestorage.app",
  messagingSenderId: "118490098233",
  appId: "1:118490098233:web:34ce28f9be0a17210abbe8",
  measurementId: "G-N86TY53MB5"
};
```

> **Note:** Firebase client config is safe to embed in the client bundle. The `apiKey` is not a secret — it's used for client-side Firebase identification, and Firestore rules enforce data isolation.

---

## .env File

The repository includes a `.env` file (gitignored) for local development:

```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

This is a Prisma database URL used for local development only. It's not used by the production Cloudflare deployment.

---

## Cloudflare Environment

Cloudflare Pages deployment does not use environment variables. All configuration is in code:
- Firebase config → `src/lib/firebase.ts`
- Channel list → `src/config/channels.ts`
- Category rules → `src/config/categories.ts`

To add environment variables for Cloudflare Workers:
1. Go to Cloudflare Pages → Settings → Environment variables
2. Add the variable (e.g., `MY_SECRET`)
3. Access via `process.env.MY_SECRET` in server-side code (API routes)

---

## Security Notes

| Item | Security Posture |
|---|---|
| Firebase `apiKey` | Not secret — it's a client identifier, protected by Firebase Security Rules |
| YouTube API key | Never in env vars — users store their own keys per-account in Firestore |
| `.env` file | Gitignored, not committed to repository |
| Firestore data | Protected by security rules (per-user isolation) |
| Client bundle | Contains Firebase config (safe), no secrets |

---

## Future Environment Variables

If the app evolves to need server-side secrets, consider:

| Variable | Purpose | Where to Store |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK (server-side Firestore reads) | Cloudflare Workers secrets |
| `YOUTUBE_API_KEY` | Server-side YouTube API calls | Cloudflare Workers secrets |
| `ANALYTICS_KEY` | Analytics tracking | Cloudflare environment variable |

For Cloudflare Workers secrets:
```bash
npx wrangler secret put MY_SECRET_NAME
```
