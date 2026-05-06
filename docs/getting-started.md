# Getting Started

Get Super Bulls running locally in under 5 minutes.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| **Node.js** | 18.17+ | Runtime |
| **npm** or **bun** | npm 9+ / bun 1.3+ | Package manager |
| **Git** | 2.30+ | Version control |

No YouTube API key is required. The app fetches content via free RSS feeds.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/hpiaallinvalue-ops/Super-Bulls.git
cd Super-Bulls

# Install dependencies
npm install
# or: bun install
```

---

## Running Locally

```bash
# Start the dev server (port 3000)
npm run dev

# The app opens at http://localhost:3000
```

The dev server runs with hot-reload. Changes to any file in `src/` are reflected immediately.

---

## Production Build

```bash
# Build for production
npm run build

# Start the production server locally
npm start
```

---

## Cloudflare Workers Build

```bash
# Build for Cloudflare Workers
npm run build:cf

# Preview locally on Cloudflare runtime
npm run preview
```

> **Note:** The Cloudflare build uses `@opennextjs/cloudflare` to adapt the Next.js output for the Workers runtime. See [Deployment](./architecture/deployment.md) for details.

---

## First Run — What to Expect

1. **Feed loads** — The server fetches RSS from 9 YouTube channels in parallel (~2-3 seconds)
2. **Videos appear** — Classified by sport (Football, Basketball, MMA, etc.)
3. **No sign-in required** — Browse freely, watch videos, use all features
4. **Optional sign-in** — Click "Sign In" in the header to sync watch history across devices

---

## Project Structure at a Glance

```
Super-Bulls/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home page (feed + video player)
│   │   ├── layout.tsx          # Root layout (ThemeProvider, AuthProvider)
│   │   ├── globals.css         # Global styles, theme variables
│   │   └── api/
│   │       ├── route.ts        # Health check endpoint
│   │       └── feed/
│   │           └── route.ts    # RSS feed aggregation endpoint
│   ├── components/
│   │   ├── video-card.tsx      # Video thumbnail card
│   │   ├── video-player.tsx    # Full video player view
│   │   ├── category-filter.tsx # Sport category pills
│   │   ├── feed-tabs.tsx       # Latest / Trending / History tabs
│   │   ├── footer-ad-bar.tsx   # Fixed footer ad bar
│   │   ├── auth/               # Firebase auth UI
│   │   │   ├── sign-in-dialog.tsx
│   │   │   └── user-menu.tsx
│   │   ├── api-keys-dialog.tsx # API key management dialog
│   │   └── ui/                 # shadcn/ui components (47 files)
│   ├── hooks/
│   │   ├── use-youtube-feed.ts # Main feed data hook
│   │   └── use-history.ts      # Watch history management
│   ├── lib/
│   │   ├── youtube-rss.ts      # RSS fetcher + XML parser
│   │   ├── firebase.ts         # Firebase client initialization
│   │   ├── firestore-history.ts # Watch history CRUD (Firestore)
│   │   ├── firestore-secrets.ts # API key storage (Firestore)
│   │   ├── cache.ts            # Browser-side cache (IndexedDB + localStorage)
│   │   ├── api-quota.ts        # Legacy quota manager (kept for compat)
│   │   ├── content-pipeline.ts # Legacy content pipeline (kept for compat)
│   │   ├── mock-data.ts        # Fallback mock video data
│   │   ├── category-rules.ts   # Sport classification engine
│   │   ├── quality-filter.ts   # Content quality gates
│   │   ├── ranking.ts          # Video ranking algorithms
│   │   ├── youtube-api.ts      # Legacy YouTube API client (kept for compat)
│   │   └── utils.ts            # Utility functions (cn helper)
│   ├── config/
│   │   ├── channels.ts         # YouTube channel source list
│   │   └── categories.ts       # Sport category definitions
│   └── contexts/
│       └── auth-context.tsx    # Firebase Auth context provider
├── public/
│   ├── logo.svg                # Super Bulls logo
│   ├── robots.txt              # Search engine directives
│   └── data/history.json       # Static history fallback
├── docs/                       # This documentation
├── open-next.config.ts         # Cloudflare Workers adapter config
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── wrangler.jsonc              # Cloudflare Workers config
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

---

## Next Steps

- Read the [Architecture Overview](./architecture/overview.md) to understand the system design
- Learn about the [RSS Feed System](./features/rss-feeds.md) to add or modify content sources
- Check [Deployment Guide](./contributing/deployment-guide.md) to push to production
