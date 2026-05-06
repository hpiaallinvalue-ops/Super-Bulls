# Deployment

How Super Bulls deploys to Cloudflare Workers via `@opennextjs/cloudflare`.

---

## Platform

| Component | Technology | Details |
|---|---|---|
| **Hosting** | Cloudflare Pages | Auto-deploys on push to `main` |
| **Runtime** | Cloudflare Workers | Edge computing, global distribution |
| **Adapter** | `@opennextjs/cloudflare` v1.19.6 | Next.js → Workers compatibility layer |
| **Build CLI** | Wrangler v4.88.0 | Cloudflare developer CLI |

---

## Build Pipeline

### Two-Stage Build

```bash
# Stage 1: Next.js production build
npm run build          # → next build (standalone output)
                        # → .next/standalone/

# Stage 2: Cloudflare Workers adaptation
npm run build:cf       # → opennextjs-cloudflare build
                        # → .open-next/worker.js
                        # → .open-next/assets/
```

The Cloudflare Pages dashboard build command must be:
```
npx opennextjs-cloudflare build
```

> **Important:** Do NOT use `npm run build` as the Cloudflare Pages build command. The adapter's CLI expects `next build` to be a dependency, not a recursive call. The `package.json` separates these:
> - `"build": "next build"` — standalone Next.js build
> - `"build:cf": "opennextjs-cloudflare build"` — Workers adaptation

---

## Configuration Files

### open-next.config.ts

This file configures how Next.js features map to Cloudflare Workers primitives:

```typescript
const openNextConfig: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",      // Node.js compatibility on Workers
      converter: "edge",                // Edge runtime
      proxyExternalRequest: "fetch",    // External fetches use native fetch
      incrementalCache: "dummy",        // No persistent cache on Workers
      tagCache: "dummy",                // No revalidation tags
      queue: "dummy",                   // No background jobs
    },
  },
  edgeExternals: ["node:crypto"],       // Allow Node.js crypto import
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",       // Edge middleware
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};
```

### wrangler.jsonc

Cloudflare Workers configuration:

```jsonc
{
  "name": "super-bulls",
  "compatibility_date": "2026-05-06",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

Key settings:
- `nodejs_compat` — Enables Node.js API compatibility on Workers
- `main` — Points to the adapted worker entry point
- `assets` — Static assets served from the Cloudflare Assets binding

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: "standalone",    // Required for opennextjs-cloudflare
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,  // Avoid double-render in dev
};
```

---

## SSR Safety Considerations

Cloudflare Workers does NOT provide browser APIs (`localStorage`, `indexedDB`). The following files have SSR guards:

| File | Browser API | Guard |
|---|---|---|
| `src/lib/cache.ts` | `indexedDB`, `localStorage` | `typeof window !== 'undefined'` + in-memory Map fallback |
| `src/lib/api-quota.ts` | `localStorage` | `typeof window !== 'undefined'` + fresh state fallback |

When adding new code that accesses browser APIs, always guard with:
```typescript
const isBrowser = typeof window !== 'undefined';
if (!isBrowser) return; // or use a fallback
```

---

## Cloudflare Pages Dashboard Settings

| Setting | Value |
|---|---|
| **Build command** | `npx opennextjs-cloudflare build` |
| **Build output directory** | `.open-next` |
| **Node.js version** | 18 or 20 |
| **Environment variables** | (none required — no API keys needed) |

---

## Deployment URLs

| Environment | URL Pattern |
|---|---|
| **Production** | `https://super-bulls.jbemmanuel14.workers.dev/` |
| **Preview** | `https://<branch>.super-bulls.pages.dev/` |

---

## Common Issues

### Build Error: "Missing proxyExternalRequest"

The `open-next.config.ts` must include `proxyExternalRequest: "fetch"` in both `default.override` and `middleware.override`. Without it, `@opennextjs/cloudflare` v1.19.6+ will fail.

### Build Error: Infinite Recursion

If `package.json` has `"build": "opennextjs-cloudflare build"`, the adapter re-invokes `npm run build` recursively. Fix by separating into `"build": "next build"` and `"build:cf": "opennextjs-cloudflare build"`.

### Runtime Error: "Internal Server Error"

Caused by browser-only APIs (IndexedDB, localStorage) being accessed during SSR. Fix by adding `typeof window` guards. See [SSR Safety](#ssr-safety-considerations) above.

### Environment Variables Not Available

On Cloudflare Workers, environment variables are only available server-side (API routes, SSR). Client-side code (`'use client'`) cannot access `process.env.*`. The current app doesn't require any environment variables.
