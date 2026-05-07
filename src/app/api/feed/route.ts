/**
 * Feed API Route — Non-Blocking RSS with Mock Data Fallback
 *
 * Architecture:
 *   - First request: fire-and-forget poll all channels, serve mock data immediately
 *   - Subsequent requests: fire-and-forget smart poll, serve from buffer
 *   - Buffer accumulates real RSS data over time (fills in progressively)
 *   - Mock data is always served when buffer has no videos for a category
 *   - Response is ALWAYS fast — never blocks on RSS fetches
 */

import { NextResponse } from 'next/server';
import { pollAllChannels, getPollerDiagnostics } from '@/lib/rss-poller';
import { TRUSTED_CHANNELS, CHANNEL_CATEGORY_MAP } from '@/config/channels';
import { parseRSSFeed, fetchRSSFeed } from '@/lib/youtube-rss';
import { logError, extractErrorInfo } from '@/lib/error-logger';
import type { Video } from '@/lib/mock-data';

// ── In-Memory Video Buffer ────────────────────────────────────────────────

const videoBuffer = new Map<string, Video>();
const bufferByCategory = new Map<string, Video[]>();
let bufferInitialized = false;
let bufferLastUpdated = 0;
let mockDataCache: Video[] | null = null;
let pollInProgress = false;

// ── Buffer Helpers ─────────────────────────────────────────────────────────

function addToBuffer(videos: Video[]): void {
  for (const v of videos) {
    videoBuffer.set(v.videoId, v);
  }
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

async function getMockData(): Promise<Video[]> {
  if (!mockDataCache) {
    const { MOCK_VIDEOS } = await import('@/lib/mock-data');
    mockDataCache = MOCK_VIDEOS;
  }
  return mockDataCache;
}

/**
 * Get videos for a category.
 * Merges RSS buffer with mock data — RSS first, mock fills gaps.
 */
async function getVideosForCategory(category: string): Promise<Video[]> {
  const rssVideos = getFromBuffer(category);

  if (category === 'All' && rssVideos.length > 0) {
    return rssVideos;
  }

  // For specific categories, check if RSS has content
  if (rssVideos.length > 0) return rssVideos;

  // Fallback to mock data
  const mock = await getMockData();
  if (category === 'All') return mock;
  return mock.filter(v => v.category === category);
}

// ── Background Poll (non-blocking) ─────────────────────────────────────────

function triggerBackgroundPoll(): void {
  if (pollInProgress) return;
  pollInProgress = true;

  pollAllChannels()
    .then(results => {
      for (const result of results) {
        if (result.newVideos.length > 0) {
          addToBuffer(result.newVideos);
        }
      }
    })
    .catch(() => { /* silent — buffer may still have content */ })
    .finally(() => {
      pollInProgress = false;
      bufferInitialized = true;
    });
}

async function triggerInitialPoll(): Promise<void> {
  if (bufferInitialized) return;
  bufferInitialized = true;

  try {
    const channelIds = TRUSTED_CHANNELS.map(c => c.id);
    const settled = await Promise.allSettled(
      channelIds.map(async (channelId) => {
        const channel = TRUSTED_CHANNELS.find(c => c.id === channelId)!;
        try {
          const xml = await fetchRSSFeed(channelId);
          const videos = parseRSSFeed(xml, channel.name, channelId);
          for (const v of videos) {
            v.category = CHANNEL_CATEGORY_MAP[v.channelId] || channel.category;
          }
          return videos;
        } catch {
          return [] as Video[];
        }
      })
    );
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        addToBuffer(result.value);
      }
    }
  } catch {
    /* silent — mock data will be served */
  }
}

// ── Response Cache (2-minute TTL) ─────────────────────────────────────────

const responseCache = new Map<string, { data: object; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function getCachedResponse(key: string): object | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResponse(key: string, data: object): void {
  if (responseCache.size > 50) {
    const oldest = Array.from(responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) responseCache.delete(oldest[i][0]);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ── GET /api/feed ─────────────────────────────────────────────────────────

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
          categories: Object.fromEntries(
            Array.from(bufferByCategory.entries()).map(([k, v]) => [k, v.length])
          ),
          lastUpdated: bufferLastUpdated,
          initialized: bufferInitialized,
          pollInProgress,
        },
        cache: { entries: responseCache.size, ttl: CACHE_TTL },
      });
    }

    // Fire-and-forget: initial poll on first request (non-blocking)
    if (!bufferInitialized) {
      // Serve mock data immediately while poll runs in background
      triggerInitialPoll();
    } else if (!pollInProgress) {
      // Subsequent requests: trigger smart poll in background
      triggerBackgroundPoll();
    }

    // Check response cache
    const cacheKey = `${category}_${sort}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached as Record<string, unknown>), source: 'cached' });
    }

    // Always serve from buffer (with mock fallback) — never wait for poll
    let videos = await getVideosForCategory(category);

    // Sort
    if (sort === 'trending') {
      videos = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    } else {
      videos = [...videos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    const isUsingMock = videoBuffer.size === 0;
    const responseData = {
      videos,
      source: isUsingMock ? 'mock' : 'rss',
      totalInBuffer: videoBuffer.size,
      channels: TRUSTED_CHANNELS.length,
    };

    setCachedResponse(cacheKey, responseData);
    return NextResponse.json(responseData);

  } catch (err) {
    const { message, stack, digest } = extractErrorInfo(err);
    logError({ source: 'api', route: '/api/feed', message, stack, digest });
    return NextResponse.json(
      { error: 'Feed temporarily unavailable', logged: true },
      { status: 500 }
    );
  }
}
