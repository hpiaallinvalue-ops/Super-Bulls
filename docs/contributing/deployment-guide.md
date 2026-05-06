# Deployment Guide

How to deploy Super Bulls to Cloudflare Pages.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Cloudflare account** | Free tier works |
| **GitHub repository** | Push triggers auto-deploy |
| **Cloudflare Pages project** | Connected to the GitHub repo |

---

## Initial Setup

### 1. Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select the `Super-Bulls` repository
4. Configure build settings (see below)
5. Click "Save and Deploy"

### 2. Build Configuration

| Setting | Value |
|---|---|
| **Framework preset** | None (custom) |
| **Build command** | `npx opennextjs-cloudflare build` |
| **Build output directory** | `.open-next` |
| **Node.js version** | 18 or 20 |

> **Important:** Do NOT use `npm run build` as the build command. The `opennextjs-cloudflare` CLI expects `next build` to be called internally. Using `npm run build` creates an infinite recursion loop.

### 3. Environment Variables

No environment variables are required for the current RSS-based setup. Leave the environment variables section empty.

If you need to add secrets in the future:
1. Go to Pages → Settings → Environment variables
2. Click "Add variable"
3. Set the variable name and value
4. Choose the environment (Production, Preview, or both)

### 4. Custom Domain (Optional)

1. Go to Pages → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `superbulls.com`)
4. Follow Cloudflare's DNS instructions

---

## Deployment Process

### Automatic (Recommended)

Every push to the `main` branch triggers an automatic deployment:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

Cloudflare Pages will:
1. Pull the latest code
2. Run `npx opennextjs-cloudflare build`
3. Deploy to `https://super-bulls.jbemmanuel14.workers.dev/`
4. Show build logs in the dashboard

### Manual Deploy

```bash
# Build and deploy in one command
npm run deploy
```

Or using Wrangler directly:
```bash
# Build for Workers
npm run build:cf

# Deploy
npx wrangler pages deploy .open-next
```

---

## Production Checklist

Before deploying to production, verify:

- [ ] `npm run build` passes locally (no TypeScript errors)
- [ ] No `console.error` or unhandled exceptions in new code
- [ ] All browser APIs are SSR-guarded (`typeof window !== 'undefined'`)
- [ ] Firebase config is correct (if modified)
- [ ] Channel list is up to date (if modified)
- [ ] New components are responsive on mobile
- [ ] Dark mode works correctly
- [ ] No new dependencies are accidentally added

---

## Build Failures

### Common Issues

#### "Missing proxyExternalRequest"

**Cause:** `open-next.config.ts` is missing `proxyExternalRequest: "fetch"`.

**Fix:** Ensure both `default.override` and `middleware.override` include all required fields:
```typescript
override: {
  wrapper: "cloudflare-node",
  converter: "edge",
  proxyExternalRequest: "fetch",
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
}
```

#### "Infinite recursion" or "build taking too long"

**Cause:** `package.json` has `"build": "opennextjs-cloudflare build"` which recursively calls `npm run build`.

**Fix:** Change to:
```json
{
  "build": "next build",
  "build:cf": "opennextjs-cloudflare build"
}
```

And update the Cloudflare Pages build command to `npx opennextjs-cloudflare build`.

#### "Internal Server Error" on deployed site

**Cause:** Browser-only APIs (localStorage, IndexedDB) accessed during SSR.

**Fix:** Add SSR guards:
```typescript
const isBrowser = typeof window !== 'undefined';
if (!isBrowser) return null; // or use a fallback
```

#### Build times out (>5 minutes)

**Cause:** Too many channels or slow RSS fetches.

**Fix:**
- Reduce channel count
- Check YouTube RSS availability from Cloudflare's network
- Consider increasing the Cloudflare Pages build timeout

---

## Monitoring

### Build Logs

View in Cloudflare Dashboard → Pages → Super Bulls → Deployments → [deployment] → View details

### Runtime Logs

Enable observability in `wrangler.jsonc`:
```jsonc
{
  "observability": {
    "enabled": true
  }
}
```

View logs in Cloudflare Dashboard → Workers & Pages → Super Bulls → Logs

### Uptime Monitoring

Use Cloudflare's built-in analytics or an external monitor (UptimeRobot, Better Stack) to track availability.

---

## Rollback

If a deployment causes issues:

1. Go to Cloudflare Dashboard → Pages → Super Bulls → Deployments
2. Find the last working deployment
3. Click "Rollback to this deployment"
4. The previous version is immediately live

Alternatively, revert the commit on GitHub:
```bash
git revert HEAD
git push origin main
```

---

## Preview Deployments

Every push to a non-`main` branch creates a preview deployment:

```
https://<branch-name>.super-bulls.pages.dev/
```

Preview deployments are useful for:
- Testing changes before merging to main
- Getting feedback from stakeholders
- Verifying build compatibility
