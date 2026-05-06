/**
 * Content Pipeline — Military-Grade 6-Phase Deterministic Content System
 *
 * Architecture:
 *   PHASE 1: SOURCE ACQUISITION — Fetch from trusted channels, whitelisted, then search
 *   PHASE 2: DEDUPLICATION     — Merge all sources, dedupe by videoId
 *   PHASE 3: QUALITY GATES     — 4-stage filter (channel, views, recency, title)
 *   PHASE 4: CLASSIFICATION    — Rule-based keyword matching → sport category
 *   PHASE 5: RANKING           — Weighted score: Views×0.4 + Likes×0.2 + Comments×0.1 + Recency×0.3
 *   PHASE 6: DELIVERY          — Tiered cache, stale-while-revalidate, fallback chain
 *
 * Every phase is deterministic. No randomness. No hope-based fetching.
 * Results are reproducible given the same inputs and time window.
 */

import type { Video } from './mock-data';
import { quotaManager, type Priority } from './api-quota';
import { searchSportsVideos, getVideosByChannel, getVideoStatsBatch, hasApiKey } from './youtube-api';
import { classifyVideo } from './category-rules';
import { checkVideoQuality, checkTitleQuality } from './quality-filter';
import { computeRankingScores, rankVideos, sortByLatest } from './ranking';
import { cache } from './cache';
import { TRUSTED_CHANNELS } from '@/config/channels';
import type { ApiOperation } from './api-quota';

// ── Types ───────────────────────────────────────────────────────────────────

export type FeedSort = 'latest' | 'trending';

export interface PipelineConfig {
  category: string;
  sort: FeedSort;
  page: number;
  perPage: number;
  /** If true, skip API and only serve from cache/mock */
  offlineMode: boolean;
}

export interface PipelineResult {
  videos: Video[];
  hasMore: boolean;
  source: 'api' | 'cache' | 'mock' | 'hybrid';
  pipelineLog: PipelineLogEntry[];
  quotaUsed: number;
}

interface PipelineLogEntry {
  phase: string;
  action: string;
  count?: number;
  duration?: number;
  status: 'ok' | 'skipped' | 'fallback';
  detail?: string;
}

// ── Search Query Strategy ────────────────────────────────────────────────────
// Deterministic queries per category. No randomness.
// Queries are ordered by specificity — more targeted first.

const SEARCH_STRATEGY: Record<string, string[]> = {
  general: [
    'sports highlights today 2025',
    'latest sports news highlights',
  ],
  Football: [
    'football highlights today 2025',
    'soccer goals highlights premier league',
  ],
  Basketball: [
    'NBA highlights today 2025',
    'basketball highlights dunk',
  ],
  Cricket: [
    'cricket highlights today 2025',
    'IPL highlights latest match',
  ],
  MMA: [
    'UFC highlights today 2025',
    'MMA fight highlights knockout',
  ],
  Tennis: [
    'tennis highlights today 2025',
    'ATP WTA match highlights',
  ],
  Baseball: [
    'MLB highlights today 2025',
    'baseball home run highlights',
  ],
  Other: [
    'sports highlights today 2025',
    'F1 racing highlights NFL NBA',
  ],
};

function getSearchQueries(category: string): string[] {
  return SEARCH_STRATEGY[category] || SEARCH_STRATEGY.general;
}

/** Deterministic channel subset based on category (no randomness) */
function getChannelsForCategory(category: string): typeof TRUSTED_CHANNELS {
  if (category === 'All') return TRUSTED_CHANNELS;

  const categoryMap: Record<string, string[]> = {
    Football: ['UCDjFJ-YdsJ3VT2zBOPOdqeA', 'UCiiljEMOGL7SUhPCrCO-MOg', 'UC8-ZWfFvkRnN2Lfl8fFbK0A'],
    Basketball: ['UCWJ2lWNubArHWmf3FIHbfcQ', 'UCiiljEMOGL7SUhPCrCO-MOg'],
    Cricket: ['UC8-ZWfFvkRnN2Lfl8fFbK0A', 'UCiiljEMOGL7SUhPCrCO-MOg'],
    MMA: ['UCvgfXK4aHYobs0s2FhW6pNg', 'UCiiljEMOGL7SUhPCrCO-MOg'],
    Tennis: ['UCiiljEMOGL7SUhPCrCO-MOg', 'UC8-ZWfFvkRnN2Lfl8fFbK0A'],
    Baseball: ['UCiiljEMOGL7SUhPCrCO-MOg', 'UC8-ZWfFvkRnN2Lfl8fFbK0A'],
    Other: TRUSTED_CHANNELS.map(c => c.id),
  };

  const ids = categoryMap[category];
  if (!ids) return TRUSTED_CHANNELS;
  return TRUSTED_CHANNELS.filter(c => ids.includes(c.id));
}

// ── Retry with Exponential Backoff ──────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  operation: ApiOperation,
  maxRetries: number = 2,
  priority: Priority = 'P2_STANDARD'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check quota before each attempt
    if (!quotaManager.canProceed(operation, attempt === 0 ? priority : 'P1_HIGH')) {
      throw new Error(`Quota exhausted for ${operation} (priority: ${priority})`);
    }

    try {
      const result = await fn();
      quotaManager.recordUsage(operation, priority);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Retry exhausted');
}

// ── The Pipeline ────────────────────────────────────────────────────────────

export async function runContentPipeline(config: PipelineConfig): Promise<PipelineResult> {
  const startTime = performance.now();
  const log: PipelineLogEntry[] = [];

  // ── STAGE 0: Cache Check (instant delivery if fresh) ────────────────────
  const cacheKey = `pipeline_${config.category || 'all'}_p${config.page}_${config.sort}`;

  if (config.page <= 2) { // Only cache first 2 pages
    const cached = await cache.get<Video[]>(cacheKey);
    if (cached && cached.length >= config.perPage) {
      log.push({ phase: 'CACHE', action: 'hit', count: cached.length, status: 'ok' });
      return {
        videos: cached.slice(0, config.perPage),
        hasMore: cached.length > config.perPage,
        source: 'cache',
        pipelineLog: log,
        quotaUsed: 0,
      };
    }
    if (cached) {
      log.push({ phase: 'CACHE', action: 'stale', count: cached.length, status: 'fallback' });
    } else {
      log.push({ phase: 'CACHE', action: 'miss', status: 'skipped' });
    }
  }

  // ── If offline or no API key, serve mock data ───────────────────────────
  if (!hasApiKey() || config.offlineMode) {
    log.push({ phase: 'API', action: 'skipped (no key/offline)', status: 'skipped' });
    const mockResult = await serveFromMock(config, log);
    return mockResult;
  }

  let allVideos: Video[] = [];
  let usedApi = false;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: SOURCE ACQUISITION
    // Priority: Trusted channels → Category search → Broad search
    // ═══════════════════════════════════════════════════════════════════════

    const phaseStart = performance.now();

    // 1A: Trusted Channel Fetch (highest quality, deterministic)
    const channels = getChannelsForCategory(config.category);
    const channelVideos = await fetchFromChannels(channels, config.page, log);

    // 1B: Category Search (breadth coverage)
    const queries = getSearchQueries(config.category);
    const searchVideos = await fetchFromSearch(queries, config.page, log);

    // Merge all sources
    allVideos = [...channelVideos, ...searchVideos];
    usedApi = channelVideos.length > 0 || searchVideos.length > 0;

    log.push({
      phase: 'ACQUISITION',
      action: 'complete',
      count: allVideos.length,
      duration: Math.round(performance.now() - phaseStart),
      status: usedApi ? 'ok' : 'fallback',
      detail: `channels: ${channelVideos.length}, search: ${searchVideos.length}`,
    });

    // 1C: Batch-enrich with full stats (duration, etc.)
    if (allVideos.length > 0) {
      await enrichVideoStats(allVideos, log);
    }
  } catch (err) {
    log.push({
      phase: 'ACQUISITION',
      action: 'failed',
      status: 'fallback',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // If API produced nothing, fall back to mock
  if (allVideos.length === 0) {
    const mockResult = await serveFromMock(config, log);
    return mockResult;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2: DEDUPLICATION
  // ═══════════════════════════════════════════════════════════════════════
  const phaseStart2 = performance.now();
  const seenIds = new Set<string>();
  const dedupedVideos = allVideos.filter(v => {
    if (seenIds.has(v.videoId)) return false;
    seenIds.add(v.videoId);
    return true;
  });

  log.push({
    phase: 'DEDUPLICATION',
    action: 'dedupe',
    count: dedupedVideos.length,
    duration: Math.round(performance.now() - phaseStart2),
    status: 'ok',
    detail: `removed ${allVideos.length - dedupedVideos.length} duplicates`,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3: QUALITY GATES (4-stage filter)
  // ═══════════════════════════════════════════════════════════════════════
  const phaseStart3 = performance.now();
  const qualityPassed = dedupedVideos.filter(v => {
    // Gate 1: Channel eligibility
    const channelCheck = checkVideoQuality(0, v.viewCount, v.channelId, v.publishedAt);
    if (!channelCheck.pass && v.viewCount < 10000) return false;

    // Gate 2: View threshold (10K minimum for non-trusted)
    if (v.viewCount < 10000) return false;

    // Gate 3: Recency (must be within 30 days)
    const daysSince = (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return false;

    // Gate 4: Title quality (no spam, must be sports-related)
    const titleCheck = checkTitleQuality(v.title);
    if (!titleCheck.pass) return false;

    return true;
  });

  log.push({
    phase: 'QUALITY',
    action: 'filtered',
    count: qualityPassed.length,
    duration: Math.round(performance.now() - phaseStart3),
    status: 'ok',
    detail: `removed ${dedupedVideos.length - qualityPassed.length} low-quality videos`,
  });

  // If quality filter removed everything, use deduped (less strict for trusted)
  const finalPool = qualityPassed.length > 0 ? qualityPassed : dedupedVideos.slice(0, 20);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4: CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════
  const phaseStart4 = performance.now();
  const classified = finalPool.map(v => ({
    ...v,
    category: v.category || classifyVideo(v.title, v.description),
  }));

  log.push({
    phase: 'CLASSIFICATION',
    action: 'classified',
    count: classified.length,
    duration: Math.round(performance.now() - phaseStart4),
    status: 'ok',
  });

  // Filter by requested category
  const filtered = config.category === 'All'
    ? classified
    : classified.filter(v => v.category === config.category);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5: RANKING / SORTING
  // ═══════════════════════════════════════════════════════════════════════
  const phaseStart5 = performance.now();
  const sorted = config.sort === 'trending'
    ? rankVideos(filtered)
    : sortByLatest(filtered);

  log.push({
    phase: 'RANKING',
    action: config.sort,
    count: sorted.length,
    duration: Math.round(performance.now() - phaseStart5),
    status: 'ok',
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 6: DELIVERY (paginate + cache)
  // ═══════════════════════════════════════════════════════════════════════
  const startIdx = (config.page - 1) * config.perPage;
  const pageVideos = sorted.slice(startIdx, startIdx + config.perPage);
  const hasMore = startIdx + config.perPage < sorted.length;

  // Cache full sorted list for fast pagination
  if (config.page <= 2 && sorted.length > 0) {
    await cache.set(cacheKey, sorted, 8 * 60 * 1000); // 8 min TTL (slightly less than refresh)
  }

  log.push({
    phase: 'DELIVERY',
    action: 'paginated',
    count: pageVideos.length,
    status: 'ok',
    detail: `page ${config.page}, hasMore: ${hasMore}`,
  });

  return {
    videos: pageVideos,
    hasMore,
    source: usedApi ? 'api' : 'cache',
    pipelineLog: log,
    quotaUsed: quotaManager.used,
  };
}

// ── Helper: Fetch from trusted channels ─────────────────────────────────────

async function fetchFromChannels(
  channels: typeof TRUSTED_CHANNELS,
  page: number,
  log: PipelineLogEntry[]
): Promise<Video[]> {
  // Only fetch channels on page 1 (subsequent pages paginate from cache)
  if (page > 1) return [];

  const videos: Video[] = [];
  const maxChannelsPerFetch = 3; // Limit to stay within quota

  for (let i = 0; i < Math.min(channels.length, maxChannelsPerFetch); i++) {
    const channel = channels[i];
    try {
      const channelVids = await withRetry(
        () => getVideosByChannel(channel.id, 5),
        'search',
        1,
        'P0_CRITICAL'
      );
      videos.push(...channelVids);
      log.push({
        phase: 'ACQUISITION',
        action: `channel: ${channel.name}`,
        count: channelVids.length,
        status: 'ok',
      });
    } catch (err) {
      log.push({
        phase: 'ACQUISITION',
        action: `channel: ${channel.name}`,
        status: 'fallback',
        detail: err instanceof Error ? err.message : 'failed',
      });
    }
  }

  return videos;
}

// ── Helper: Fetch from search queries ──────────────────────────────────────

async function fetchFromSearch(
  queries: string[],
  page: number,
  log: PipelineLogEntry[]
): Promise<Video[]> {
  if (!quotaManager.canProceed('search', 'P1_HIGH')) {
    log.push({
      phase: 'ACQUISITION',
      action: 'search (quota limited)',
      status: 'skipped',
      detail: `remaining: ${quotaManager.remaining}`,
    });
    return [];
  }

  // Use the FIRST query deterministically (index 0) for page 1
  // Use the SECOND query for page 2 (more variety)
  const queryIdx = Math.min(page - 1, queries.length - 1);
  const query = queries[queryIdx];

  try {
    const result = await withRetry(
      () => searchSportsVideos(query),
      'search',
      2,
      'P1_HIGH'
    );
    log.push({
      phase: 'ACQUISITION',
      action: `search: "${query}"`,
      count: result.videos.length,
      status: 'ok',
    });
    return result.videos;
  } catch (err) {
    log.push({
      phase: 'ACQUISITION',
      action: `search: "${query}"`,
      status: 'fallback',
      detail: err instanceof Error ? err.message : 'failed',
    });
    return [];
  }
}

// ── Helper: Batch-enrich with stats ─────────────────────────────────────────

async function enrichVideoStats(videos: Video[], log: PipelineLogEntry[]): Promise<void> {
  if (videos.length === 0) return;
  if (!quotaManager.canProceed('videos', 'P2_STANDARD')) {
    log.push({ phase: 'ENRICHMENT', action: 'skipped (quota)', status: 'skipped' });
    return;
  }

  try {
    const videoIds = videos.map(v => v.videoId);
    // Batch in groups of 50 (YouTube API limit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const stats = await getVideoStatsBatch(batch);
      for (const video of videos) {
        const s = stats[video.videoId];
        if (s) {
          video.viewCount = s.viewCount || video.viewCount;
          video.likeCount = s.likeCount || video.likeCount;
          video.commentCount = s.commentCount || video.commentCount;
        }
      }
      quotaManager.recordUsage('videos', 'P2_STANDARD');
    }
    log.push({ phase: 'ENRICHMENT', action: 'stats enriched', count: videos.length, status: 'ok' });
  } catch {
    log.push({ phase: 'ENRICHMENT', action: 'failed', status: 'fallback' });
  }
}

// ── Mock Fallback ───────────────────────────────────────────────────────────

async function serveFromMock(config: PipelineConfig, log: PipelineLogEntry[]): Promise<PipelineResult> {
  const { getMockVideos } = await import('./mock-data');
  const mockVids = getMockVideos(config.category === 'All' ? undefined : config.category);

  const sorted = config.sort === 'trending'
    ? rankVideos(mockVids)
    : sortByLatest(mockVids);

  const startIdx = (config.page - 1) * config.perPage;
  const pageVideos = sorted.slice(startIdx, startIdx + config.perPage);
  const hasMore = startIdx + config.perPage < sorted.length;

  log.push({
    phase: 'MOCK',
    action: 'serving mock data',
    count: pageVideos.length,
    status: 'ok',
    detail: 'API unavailable or no key configured',
  });

  return {
    videos: pageVideos,
    hasMore,
    source: 'mock',
    pipelineLog: log,
    quotaUsed: quotaManager.used,
  };
}

// ── Pipeline Health Check ───────────────────────────────────────────────────

export function getPipelineHealth(): {
  quota: ReturnType<typeof quotaManager.getSummary>;
  apiKeyConfigured: boolean;
  recommendation: string;
} {
  const quota = quotaManager.getSummary();
  const hasApi = hasApiKey();

  let recommendation: string;
  if (!hasApi) {
    recommendation = 'No YouTube API key configured. Running on mock data. Add NEXT_PUBLIC_YOUTUBE_API_KEY for live content.';
  } else if (quotaManager.isExhausted) {
    recommendation = 'Daily API quota exhausted. Switching to cached/mock data until reset (midnight Pacific).';
  } else if (quotaManager.isConservationMode) {
    recommendation = `API quota at ${quota.percent}%. Conservation mode active — only high-priority fetches proceed.`;
  } else {
    recommendation = `System nominal. ${quota.remaining.toLocaleString()} quota units remaining today.`;
  }

  return { quota, apiKeyConfigured: hasApi, recommendation };
}
