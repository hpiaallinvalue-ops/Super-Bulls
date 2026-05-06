# Architecture Overview

High-level system design, technology choices, and structural decisions for Super Bulls.

---

## What is Super Bulls?

Super Bulls is a **sports news video aggregator** that pulls the latest sports highlights, breaking news, and trending content from popular YouTube channels via free RSS feeds. It classifies every video by sport category, ranks them, and delivers a fast, mobile-first viewing experience.

**Key design principles:**
- **No API key required** — content comes from YouTube RSS feeds (free, unlimited)
- **Sign-in is optional** — full browsing without an account; sign-in only enables watch history sync
- **Mobile-first** — responsive design optimized for phones, tablets, and desktops
- **Edge-deployed** — runs on Cloudflare Workers for global low-latency delivery

---

## Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| **Next.js** | 16 (React 19) | App Router, SSR, API routes |
| **Tailwind CSS** | 4 | Utility-first styling |
| **shadcn/ui** | Latest | Pre-built accessible UI components (47 components) |
| **Framer Motion** | 12 | Page transitions, card animations |
| **Lucide React** | Latest | Icon library |
| **Sonner** | Latest | Toast notifications |

### Backend & Data

| Technology | Role |
|---|---|
| **YouTube RSS** | Primary content source (free, no API key) |
| **Firebase Auth** | Optional user authentication (email/password + Google) |
| **Cloudflare Firestore** | Watch history and API key storage (per-user) |
| **Next.js API Routes** | Server-side RSS aggregation endpoint |

### Deployment & Infrastructure

| Technology | Role |
|---|---|
| **Cloudflare Workers** | Edge runtime for the entire application |
| **@opennextjs/cloudflare** | Next.js → Workers adapter (v1.19.6) |
| **Cloudflare Pages** | Hosting and CI/CD (auto-deploy on push to `main`) |
| **Wrangler** | Cloudflare CLI for local preview and deployment |

### Development Tools

| Technology | Role |
|---|---|
| **TypeScript** | Type safety |
| **ESLint** | Code linting |
| **Turbopack** | Fast bundler (Next.js built-in) |
| **Bun** | Fast package manager (optional, npm also supported) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ page.tsx  │  │use-youtube-  │  │    use-history.ts     │ │
│  │  (Feed +  │──│feed.ts       │──│ (IndexedDB /          │ │
│  │  Player)  │  │ /api/feed    │  │  Firestore sync)      │ │
│  └──────────┘  └──────────────┘  └───────────────────────┘ │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────────┐    │
│  │              UI Components Layer                      │    │
│  │  VideoCard │ VideoPlayer │ CategoryFilter │ FeedTabs │    │
│  │  SignInDialog │ UserMenu │ ApiKeysDialog │ FooterAd │    │
│  └────────────────────────────────────────────────────┘    │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────────┐    │
│  │              Context Providers                        │    │
│  │  ThemeProvider (light/dark) │ AuthProvider (Firebase) │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch /api/feed
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                SERVER (Cloudflare Workers)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           /api/feed/route.ts                          │   │
│  │                                                       │   │
│  │  1. Check in-memory cache (5-min TTL)                │   │
│  │  2. Fetch RSS from all channels in parallel          │   │
│  │  3. Parse XML → Video[]                              │   │
│  │  4. Classify by sport category                       │   │
│  │  5. Filter by requested category                     │   │
│  │  6. Cache + return JSON                              │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────────┐   │
│  │              Data Sources                             │   │
│  │  YouTube RSS (9 channels) │ Firestore (auth/history) │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Application Routing

The app uses **Next.js App Router** with a single-page architecture:

| Route | Type | Description |
|---|---|---|
| `/` | Static (SSG) | Home page — feed view + video player (client-side navigation) |
| `/_not-found` | Static | Custom 404 page |
| `/api` | Dynamic | Health check endpoint |
| `/api/feed` | Dynamic | RSS feed aggregation endpoint |

The home page handles two views via client-side state (no page navigation):
- **Feed view** — video grid with category filter and tabs
- **Detail view** — embedded YouTube player with video info and related videos

---

## State Management

The app uses a layered state approach:

| Layer | Technology | Scope | Purpose |
|---|---|---|---|
| **Server cache** | In-memory `Map` | Per-isolate, 5-min TTL | RSS feed responses |
| **Browser cache** | IndexedDB → localStorage fallback | Per-device | Watch history, API responses |
| **React state** | `useState` + `useCallback` | Per-component | UI state, view switching |
| **Context** | React Context (`AuthProvider`) | App-wide | Auth state, user info |
| **Firebase** | Cloud Firestore | Per-user (cross-device) | Watch history, API keys |

No global state library (Redux, Zustand, etc.) is used in production. The app was scaffolded with Zustand available but the current architecture doesn't require it.

---

## Design System

The UI is built on **shadcn/ui** with a custom sports-themed design:

- **Primary color**: Red 600 (`bg-red-600`) — brand accent for buttons, active states
- **Font**: Inter (body) + Oswald (headings/brand)
- **Theme**: Light and dark mode via `next-themes` with CSS class strategy
- **Colors**: OKLCH color space for theme variables
- **Components**: 47 shadcn/ui components available (buttons, dialogs, tabs, etc.)
- **Animations**: Framer Motion for page transitions and card hover effects

---

## Security Model

| Concern | Approach |
|---|---|
| **Authentication** | Firebase Auth — tokens managed client-side, never exposed in API routes |
| **Data isolation** | Firestore rules enforce per-user access (`request.auth.uid == userId`) |
| **API keys** | Stored per-user in Firestore, never in environment variables on the client |
| **Content** | All content comes from YouTube RSS (trusted sources), no user-generated content |
| **XSS** | React's built-in escaping + no `dangerouslySetInnerHTML` in app code |
| **SSR safety** | All browser APIs (IndexedDB, localStorage) guarded with `typeof window` checks |
