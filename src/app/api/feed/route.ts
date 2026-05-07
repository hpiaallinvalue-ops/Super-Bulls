/**
 * Feed API Route — Live RSS Data Only
 *
 * No mock data. No fallbacks. Pure live RSS feeds via rss2json.com proxy.
 *
 * Architecture:
 *   - First request: initial load via poller (parallel fetch for speed)
 *   - Subsequent requests: serve from buffer, fire-and-forget smart poll
 *   - Buffer persists in memory, fills progressively over time
 */

import { NextResponse } from 'next/server';
import { pollAllChannels, pollChannelsByIds, getPollerDiagnostics } from '@/lib/rss-poller';
import { TRUSTED_CHANNELS } from '@/config/channels';
import { logError, extractErrorInfo } from '@/lib/error-logger';
import type { Video } from '@/lib/mock-data';

// ── In-Memory Video Buffer ────────────────────────────────────────────────

const videoBuffer = new Map<string, Video>();
const bufferByCategory = new Map<string, Video[]>();

let bufferInitialized = false;
let bufferLastUpdated = 0;
let pollInProgress = false;
let initialLoadPromise: Promise<void> | null = null;

function addToBuffer(videos: Video[]): void {
  for (const v of videos) videoBuffer.set(v.videoId, v);
  rebuildCategoryIndex();
  bufferLastUpdated = Date.now();
}

function rebuildCategoryIndex(): void {
  bufferByCategory.clear();
  for (const video of videoBuffer.values()) {
    const cat = video.category || 'Other';
    if (!bufferByCategory.has(cat)) bufferByCategory.set(cat, []);
    bufferByCategory.get(cat)!.push(video);
  }
}

function getFromBuffer(category: string): Video[] {
  if (category === 'All') return Array.from(videoBuffer.values());
  return bufferByCategory.get(category) || [];
}

// ── Initial Load (synced with poller state) ────────────────────────────────
// Fetches all channels through the poller so channelStates are kept in sync,
// preventing duplicate fetches and stale-detection timing issues.

async function initializeBuffer(): Promise<void> {
  if (bufferInitialized) return;
  bufferInitialized = true;

  // Fetch all channels through the poller so channelStates are synced
  try {
    const allVideos = await pollChannelsByIds(TRUSTED_CHANNELS.map(c => c.id));
    if (allVideos.length > 0) addToBuffer(allVideos);
  } catch {
    // Individual channel errors are handled inside pollChannelsByIds
    // Mark as uninitialized so next request will retry
    bufferInitialized = false;
  }
}

// ── Background Poll ────────────────────────────────────────────────────────

function triggerBackgroundPoll(): void {
  if (pollInProgress) return;
  pollInProgress = true;

  pollAllChannels()
    .then(results => {
      for (const r of results) {
        if (r.newVideos.length > 0) addToBuffer(r.newVideos);
      }
    })
    .catch(() => {})
    .finally(() => { pollInProgress = false; });
}

// ── Response Cache (30-sec TTL) ──────────────────────────────────────────

const responseCache = new Map<string, { data: object; timestamp: number }>();
const CACHE_TTL = 30 * 1000;

function getCachedResponse(key: string): object | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { responseCache.delete(key); return null; }
  return entry.data;
}

function setCachedResponse(key: string, data: object): void {
  if (responseCache.size > 50) {
    const oldest = Array.from(responseCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) responseCache.delete(oldest[i][0]);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ── GET /api/feed?category=All&sort=latest&diagnostics=false ──────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All';
    const sort = searchParams.get('sort') || 'latest';
    const wantDiagnostics = searchParams.get('diagnostics') === 'true';

    if (wantDiagnostics) {
      return NextResponse.json({
        poller: getPollerDiagnostics(),
        buffer: {
          totalVideos: videoBuffer.size,
          categories: Object.fromEntries(Array.from(bufferByCategory.entries()).map(([k, v]) => [k, v.length])),
          lastUpdated: bufferLastUpdated,
          initialized: bufferInitialized,
        },
      });
    }

    // Initial load: fetch all channels through the poller
    if (!bufferInitialized) {
      if (!initialLoadPromise) {
        initialLoadPromise = initializeBuffer().finally(() => { initialLoadPromise = null; });
      }
      await initialLoadPromise;
    } else if (!pollInProgress) {
      triggerBackgroundPoll();
    }

    // Check cache
    const cacheKey = `${category}_${sort}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return NextResponse.json({ ...(cached as Record<string, unknown>), source: 'cached' });

    // Serve from buffer — live data only
    let videos = getFromBuffer(category);

    if (sort === 'trending') {
      videos = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    } else {
      videos = [...videos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return NextResponse.json({
      videos,
      source: 'rss',
      totalInBuffer: videoBuffer.size,
      channels: TRUSTED_CHANNELS.length,
    });

  } catch (err) {
    const { message, stack, digest } = extractErrorInfo(err);
    logError({ source: 'api', route: '/api/feed', message, stack, digest });
    return NextResponse.json(
      { error: 'Feed temporarily unavailable', logged: true },
      { status: 500 }
    );
  }
}
