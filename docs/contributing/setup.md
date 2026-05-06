# Setup Guide

Prerequisites, installation, and running Super Bulls locally.

---

## Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18.17+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.30+ | `git --version` |

Optional:
| Tool | Purpose |
|---|---|
| Bun | Faster alternative to npm (`bun install`) |
| Wrangler CLI | Local Cloudflare Workers preview |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/hpiaallinvalue-ops/Super-Bulls.git
cd Super-Bulls

# 2. Install dependencies
npm install
# or: bun install

# 3. Start the development server
npm run dev
# or: bun run dev

# 4. Open http://localhost:3000
```

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev -p 3000` | Development server with hot-reload |
| `build` | `next build` | Production build (standalone output) |
| `build:cf` | `opennextjs-cloudflare build` | Cloudflare Workers build |
| `start` | `node .next/standalone/server.js` | Start production server locally |
| `preview` | `opennextjs-cloudflare build && opennextjs-cloudflare preview` | Preview on Workers runtime locally |
| `lint` | `eslint .` | Run ESLint |
| `deploy` | `opennextjs-cloudflare deploy` | Deploy to Cloudflare Pages |

---

## Development Workflow

### Day-to-Day Development

```bash
# Start dev server
npm run dev

# Make changes in src/
# Hot-reload reflects changes automatically
```

### Testing the API Feed

```bash
# In another terminal, test the feed endpoint:
curl http://localhost:3000/api/feed?category=All
curl http://localhost:3000/api/feed?category=Football
curl http://localhost:3000/api/feed?category=Basketball
```

### Testing with Cloudflare Workers Runtime

```bash
# Build for Workers
npm run build:cf

# Preview on local Workers runtime
npm run preview
```

---

## IDE Setup

### Recommended VS Code Extensions

| Extension | Purpose |
|---|---|
| Tailwind CSS IntelliSense | Tailwind class autocompletion |
| ESLint | Inline linting |
| TypeScript | Type checking |
| Prettier | Code formatting (optional) |

### TypeScript Configuration

The project uses `tsconfig.json` with:
- `"strict": true` — Full type safety
- `"skipLibCheck": true` — Faster builds
- Path alias: `@/*` → `src/*`

---

## Firebase Setup (Optional)

If you want to modify the Firebase integration or use a different Firebase project:

1. **Firebase Console**: Create a new project (or use existing)
2. **Authentication**: Enable Email/Password and/or Google sign-in
3. **Firestore**: Create the database (start in test mode, then apply security rules)
4. **Update config**: Edit `src/lib/firebase.ts` with your project's config
5. **Security rules**: Apply the rules from [Firebase Authentication docs](../features/firebase-auth.md)

---

## Troubleshooting

### `npm install` fails

Try clearing the cache and reinstalling:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Dev server shows blank page

- Check the terminal for build errors
- Open browser DevTools console for runtime errors
- Ensure you're on Node.js 18+

### RSS feed returns no videos

- Check internet connectivity (RSS fetches go to YouTube)
- Verify YouTube is accessible from your network
- Check the `/api/feed` endpoint directly in browser

### `npm run build:cf` fails

- Ensure `wrangler` is installed: `npm install -D wrangler`
- Check `open-next.config.ts` has all required fields
- See [Deployment docs](./deployment-guide.md) for common issues
