/**
 * Feed API Route — Smart RSS Aggregation with Change Detection
 *
 * Strategy:
 *   - On first request: force-poll all channels (initial load)
 *   - On subsequent requests: use smart poller (only polls channels
 *     that are due, respecting backoff/cooldown/staleness)
 *   - All videos served from an in-memory buffer that accumulates
 *     new content across poll cycles
 *   - Cache TTL: 2 minutes (fast reads between poll cycles)
 *
 * No AI involved — purely deterministic programs:
 *   - Change detection via video-ID set comparison
 *   - Category assigned from channel config (not keyword guessing)
 *   - Staggered polling to avoid hammering YouTube
 */

import { NextResponse } from 'next/server';
import { pollAllChannels, pollChannelsByIds, getPollerDiagnostics } from '@/lib/rss-poller';
import { TRUSTED_CHANNELS, CHANNEL_CATEGORY_MAP } from '@/config/channels';
import { parseRSSFeed } from '@/lib/youtube-rss';
import { fetchRSSFeed } from '@/lib/youtube-rss';
import { logError, extractErrorInfo } from '@/lib/error-logger';
import type { Video } from '@/lib/mock-data';

// ── In-Memory Video Buffer ────────────────────────────────────────────────
// Accumulates all discovered videos. Survives across CF Worker isolates.

const videoBuffer = new Map<string, Video>(); // videoId → Video
const bufferByCategory = new Map<string, Video[]>(); // category → Video[]

let bufferInitialized = false;
let bufferLastUpdated = 0;

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
    if (!bufferByCategory.has(cat)) {
      bufferByCategory.set(cat, []);
    }
    bufferByCategory.get(cat)!.push(video);
  }
}

function getFromBuffer(category: string): Video[] {
  if (category === 'All') {
    return Array.from(videoBuffer.values());
  }
  return bufferByCategory.get(category) || [];
}

// ── Initial Load (first request) ──────────────────────────────────────────

async function initializeBuffer(): Promise<void> {
  if (bufferInitialized) return;
  bufferInitialized = true;

  // Force-poll ALL channels on first load (ignore backoff)
  const channelIds = TRUSTED_CHANNELS.map(c => c.id);

  const settled = await Promise.allSettled(
    channelIds.map(async (channelId) => {
      const channel = TRUSTED_CHANNELS.find(c => c.id === channelId)!;
      try {
        const xml = await fetchRSSFeed(channelId);
        const videos = parseRSSFeed(xml, channel.name, channelId);
        // Assign category deterministically from channel config
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
}

// ── Cache Layer (2-minute TTL for fast reads) ─────────────────────────────

const responseCache = new Map<string, { data: object; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
  // Limit cache size
  if (responseCache.size > 50) {
    const oldest = Array.from(responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) {
      responseCache.delete(oldest[i][0]);
    }
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

    // Diagnostics endpoint (no side effects)
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
        },
        cache: {
          entries: responseCache.size,
          ttl: CACHE_TTL,
        },
      });
    }

    // Ensure buffer is populated on first request
    if (!bufferInitialized) {
      await initializeBuffer();
    } else {
      // Run smart poll — only fetches channels that are due
      const pollResults = await pollAllChannels();
      for (const result of pollResults) {
        if (result.newVideos.length > 0) {
          addToBuffer(result.newVideos);
        }
      }
    }

    // Check response cache
    const cacheKey = `${category}_${sort}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached as object, source: 'cached' });
    }

    // Get videos from buffer
    let videos = getFromBuffer(category);

    // Sort
    if (sort === 'trending') {
      videos = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    } else {
      videos = [...videos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    const responseData = {
      videos,
      source: bufferInitialized ? 'rss' : 'initial-load',
      totalInBuffer: videoBuffer.size,
      channels: TRUSTED_CHANNELS.length,
    };

    setCachedResponse(cacheKey, responseData);

    return NextResponse.json(responseData);

  } catch (err) {
    const { message, stack, digest } = extractErrorInfo(err);
    logError({
      source: 'api',
      route: `/api/feed`,
      message,
      stack,
      digest,
    });
    return NextResponse.json(
      { error: 'Feed temporarily unavailable', logged: true },
      { status: 500 }
    );
  }
}
