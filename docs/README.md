# Super Bulls — Documentation

**Sports news video aggregator** powered by YouTube RSS feeds, built with Next.js 16 and deployed on Cloudflare Workers.

---

## Documentation Map

### [Getting Started](./getting-started.md)
Quick setup, local development, and first run. Start here if you're new to the project.

### Architecture
| Document | Description |
|---|---|
| [Overview](./architecture/overview.md) | System architecture, tech stack, project structure, and high-level design decisions |
| [Content Pipeline](./architecture/content-pipeline.md) | How content flows from YouTube RSS feeds to the user's screen |
| [Data Flow](./architecture/data-flow.md) | End-to-end request lifecycle, component hierarchy, and state management |
| [Deployment](./architecture/deployment.md) | Cloudflare Workers deployment via `@opennextjs/cloudflare`, environment setup |

### Features
| Document | Description |
|---|---|
| [RSS Feed System](./features/rss-feeds.md) | YouTube RSS fetching, XML parsing, channel configuration, and feed aggregation |
| [Firebase Authentication](./features/firebase-auth.md) | Optional user accounts, email/password + Google sign-in, auth context provider |
| [Watch History](./features/watch-history.md) | Local-first watch history with Firestore sync for signed-in users |
| [API Key Management](./features/api-keys.md) | User-scoped API key storage in Firestore for per-device sync |
| [Caching Strategy](./features/caching.md) | Three-tier caching: in-memory (server), IndexedDB (browser), localStorage (fallback) |

### Configuration
| Document | Description |
|---|---|
| [Channels](./configuration/channels.md) | Adding, removing, and managing YouTube channel sources |
| [Categories](./configuration/categories.md) | Sport category classification rules, keyword matching, and color system |
| [Environment Variables](./configuration/environment.md) | Required and optional environment variables, Firebase config, and secrets |

### API Reference
| Document | Description |
|---|---|
| [Feed Endpoint](./api/feed-endpoint.md) | `GET /api/feed` — RSS-aggregated video feed with caching |
| [Health Endpoint](./api/api-route.md) | `GET /api` — Service health check |

### Contributing
| Document | Description |
|---|---|
| [Setup Guide](./contributing/setup.md) | Prerequisites, installation, and running locally |
| [Coding Standards](./contributing/coding-standards.md) | Code conventions, component patterns, and commit guidelines |
| [Deployment Guide](./contributing/deployment-guide.md) | How to deploy to Cloudflare Pages, production checklist |
