/**
 * Feed API Route — Server-side RSS aggregation with caching
 *
 * Fetches RSS feeds from all configured YouTube channels in parallel,
 * classifies each video by sport category, and returns the merged feed.
 *
 * Caching: In-memory, 5-minute TTL per category.
 * On Cloudflare Workers this lives in the global scope so it survives
 * across requests within the same isolate.
 */

import { NextResponse } from 'next/server';
import { fetchRSSFeed, parseRSSFeed } from '@/lib/youtube-rss';
import { classifyVideo } from '@/lib/category-rules';
import { TRUSTED_CHANNELS } from '@/config/channels';
import type { Video } from '@/lib/mock-data';

// ── In-memory Cache ───────────────────────────────────────────────────────

interface CacheEntry {
  videos: Video[];
  timestamp: number;
}

const feedCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── GET /api/feed?category=All&sort=latest ───────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'All';

  // Check cache
  const cacheKey = `feed_${category}`;
  const cached = feedCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ videos: cached.videos, source: 'rss-cached' });
  }

  // Fetch RSS from ALL channels in parallel (no quota limit!)
  const settled = await Promise.allSettled(
    TRUSTED_CHANNELS.map(async (channel) => {
      const xml = await fetchRSSFeed(channel.id);
      const videos = parseRSSFeed(xml, channel.name, channel.id);
      // Classify each video by sport
      for (const v of videos) {
        v.category = classifyVideo(v.title, v.description);
      }
      return videos;
    })
  );

  // Merge successful results
  const allVideos: Video[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      allVideos.push(...result.value);
    }
    // Silently skip failed channels — the others still work
  }

  // Filter by category if requested
  const filtered = category === 'All'
    ? allVideos
    : allVideos.filter(v => v.category === category);

  // Cache the result
  feedCache.set(cacheKey, { videos: filtered, timestamp: Date.now() });

  // Also cache the "All" variant if this was a category-specific request
  // so switching back to "All" is instant
  if (category !== 'All' && !feedCache.has('feed_All')) {
    feedCache.set('feed_All', { videos: allVideos, timestamp: Date.now() });
  }

  return NextResponse.json({
    videos: filtered,
    source: 'rss',
    channels: TRUSTED_CHANNELS.length,
    fetchedFrom: settled.filter(r => r.status === 'fulfilled').length,
  });
}
