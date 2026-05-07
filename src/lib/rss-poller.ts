/**
 * Smart RSS Poller — Automated Feed Updates with Change Detection
 *
 * No AI. Just deterministic programs:
 *   - Per-channel polling with staggered intervals
 *   - Video-ID–based change detection (O(1) set lookup)
 *   - Exponential backoff on failure (max 3 retries, then cooldown)
 *   - Stale-channel detection (skip channels with no new content)
 *   - Memory-efficient global store (single Map, survives CF Worker isolates)
 *
 * Polling cadence:
 *   Normal:   every 5 minutes per channel
 *   Stale:    every 15 minutes (channel had no new videos last 2 polls)
 *   Backoff:  5s → 10s → 20s (on consecutive failures)
 *   Cooldown: 30 minutes (after 3 consecutive failures)
 */

import { fetchRSSFeed, parseRSSFeed } from '@/lib/youtube-rss';
import { TRUSTED_CHANNELS, CHANNEL_CATEGORY_MAP } from '@/config/channels';
import type { Video } from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChannelState {
  channelId: string;
  categoryName: string;
  /** Video IDs seen from this channel (bounded ring buffer) */
  knownIds: Set<string>;
  /** Last successful fetch timestamp */
  lastFetchedAt: number;
  /** Last time new videos were discovered */
  lastNewAt: number;
  /** Consecutive failure count */
  failures: number;
  /** Current backoff delay in ms */
  backoffMs: number;
  /** Whether channel is in cooldown (3+ consecutive failures) */
  coolingDown: boolean;
  /** Whether channel is stale (no new content in recent polls) */
  isStale: boolean;
  /** Stale counter — incremented when poll returns no new videos */
  staleCount: number;
}

interface PollResult {
  category: string;
  newVideos: Video[];
  totalFetched: number;
  channelName: string;
  skipped: boolean;
  skipReason?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000;        // 5 minutes
const STALE_INTERVAL_MS = 15 * 60 * 1000;      // 15 minutes for stale channels
const BACKOFF_STEPS = [5000, 10_000, 20_000];   // exponential backoff
const COOLDOWN_MS = 30 * 60 * 1000;             // 30 minute cooldown after 3 failures
const MAX_KNOWN_IDS = 100;                      // ring buffer cap per channel
const STALE_THRESHOLD = 2;                      // polls with no new content → stale
const MAX_BACKOFF_FAILURES = 3;                 // failures before cooldown
const FETCH_TIMEOUT_MS = 10_000;                // 10s timeout per channel

// ── Global Store (survives across requests in CF Workers) ──────────────────

const channelStates = new Map<string, ChannelState>();
let globalLastPoll = 0;

// ── Initialization ─────────────────────────────────────────────────────────

function ensureChannelStates(): void {
  if (channelStates.size === 0) {
    for (const ch of TRUSTED_CHANNELS) {
      channelStates.set(ch.id, {
        channelId: ch.id,
        categoryName: ch.category,
        knownIds: new Set<string>(),
        lastFetchedAt: 0,
        lastNewAt: 0,
        failures: 0,
        backoffMs: 0,
        coolingDown: false,
        isStale: false,
        staleCount: 0,
      });
    }
  }
}

// ── Core: Poll a Single Channel ────────────────────────────────────────────

async function pollChannel(channelId: string, channelName: string): Promise<{ videos: Video[]; error?: string }> {
  try {
    const xml = await fetchRSSFeed(channelId);
    const videos = parseRSSFeed(xml, channelName, channelId);
    return { videos };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { videos: [], error: msg };
  }
}

// ── Change Detection ───────────────────────────────────────────────────────

/**
 * Compare fetched videos against known IDs.
 * Returns only genuinely new videos (O(n) where n = fetched count).
 * Updates channel state with new known IDs (ring buffer eviction).
 */
function detectNewVideos(videos: Video[], state: ChannelState): Video[] {
  const newVideos: Video[] = [];
  const now = Date.now();

  for (const video of videos) {
    if (!state.knownIds.has(video.videoId)) {
      newVideos.push(video);
      state.knownIds.add(video.videoId);
      state.lastNewAt = now;
    }
  }

  // Ring buffer: cap known IDs to prevent unbounded memory growth
  if (state.knownIds.size > MAX_KNOWN_IDS) {
    const idsArr = Array.from(state.knownIds);
    const removeCount = idsArr.length - MAX_KNOWN_IDS;
    for (let i = 0; i < removeCount; i++) {
      state.knownIds.delete(idsArr[i]);
    }
  }

  // Track staleness
  if (newVideos.length === 0) {
    state.staleCount++;
    if (state.staleCount >= STALE_THRESHOLD) {
      state.isStale = true;
    }
  } else {
    state.staleCount = 0;
    state.isStale = false;
  }

  return newVideos;
}

// ── Backoff Management ─────────────────────────────────────────────────────

function recordSuccess(state: ChannelState): void {
  state.failures = 0;
  state.backoffMs = 0;
  state.coolingDown = false;
  state.lastFetchedAt = Date.now();
}

function recordFailure(state: ChannelState): void {
  state.failures++;
  state.backoffMs = BACKOFF_STEPS[Math.min(state.failures - 1, BACKOFF_STEPS.length - 1)] ?? COOLDOWN_MS;

  if (state.failures >= MAX_BACKOFF_FAILURES) {
    state.coolingDown = true;
    state.backoffMs = COOLDOWN_MS;
  }
}

function shouldPoll(state: ChannelState): { ready: boolean; reason?: string } {
  const now = Date.now();

  // Cooldown check
  if (state.coolingDown) {
    if (now - state.lastFetchedAt < COOLDOWN_MS) {
      return { ready: false, reason: `cooldown (${Math.ceil((COOLDOWN_MS - (now - state.lastFetchedAt)) / 1000)}s left)` };
    }
    // Cooldown expired — reset and allow polling
    state.coolingDown = false;
    state.failures = 0;
    state.backoffMs = 0;
  }

  // Backoff check
  if (state.backoffMs > 0 && now - state.lastFetchedAt < state.backoffMs) {
    return { ready: false, reason: `backoff (${Math.ceil((state.backoffMs - (now - state.lastFetchedAt)) / 1000)}s left)` };
  }

  // Stale channel uses longer interval
  const interval = state.isStale ? STALE_INTERVAL_MS : POLL_INTERVAL_MS;
  const elapsed = state.lastFetchedAt === 0 ? interval + 1 : now - state.lastFetchedAt;
  if (elapsed < interval) {
    return { ready: false, reason: `poll interval (${Math.ceil((interval - elapsed) / 1000)}s left)` };
  }

  return { ready: true };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Run a full poll cycle across all channels.
 * Returns new videos grouped by category.
 * Skips channels based on backoff/cooldown/staleness logic.
 *
 * Called by the API route on each request; lightweight because
 * most channels will be skipped due to polling intervals.
 */
export async function pollAllChannels(): Promise<PollResult[]> {
  ensureChannelStates();

  const results: PollResult[] = [];

  for (const channel of TRUSTED_CHANNELS) {
    const state = channelStates.get(channel.id);
    if (!state) continue;

    const { ready, reason } = shouldPoll(state);
    if (!ready) {
      results.push({
        category: state.categoryName,
        newVideos: [],
        totalFetched: 0,
        channelName: channel.name,
        skipped: true,
        skipReason: reason,
      });
      continue;
    }

    const { videos, error } = await pollChannel(channel.id, channel.name);

    if (error || videos.length === 0) {
      if (error) recordFailure(state);
      else state.lastFetchedAt = Date.now();

      results.push({
        category: state.categoryName,
        newVideos: [],
        totalFetched: videos.length,
        channelName: channel.name,
        skipped: error != null,
        skipReason: error,
      });
      continue;
    }

    recordSuccess(state);

    // Assign category deterministically from channel config (not keyword heuristics)
    for (const v of videos) {
      v.category = CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName;
    }

    const newVids = detectNewVideos(videos, state);

    results.push({
      category: state.categoryName,
      newVideos: newVids,
      totalFetched: videos.length,
      channelName: channel.name,
      skipped: false,
    });
  }

  globalLastPoll = Date.now();
  return results;
}

/**
 * Force-poll specific channels (ignores backoff/cooldown).
 * Used for manual refresh or initial load.
 */
export async function pollChannelsByIds(channelIds: string[]): Promise<Video[]> {
  ensureChannelStates();

  const allVideos: Video[] = [];

  for (const channelId of channelIds) {
    const channel = TRUSTED_CHANNELS.find(c => c.id === channelId);
    if (!channel) continue;

    const state = channelStates.get(channelId);
    if (!state) continue;

    const { videos, error } = await pollChannel(channelId, channel.name);
    if (error) {
      recordFailure(state);
      continue;
    }

    recordSuccess(state);

    for (const v of videos) {
      v.category = CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName;
    }

    // On force-poll, always return all videos (not just new ones)
    // but still update known IDs for subsequent change detection
    for (const v of videos) {
      state.knownIds.add(v.videoId);
    }
    allVideos.push(...videos);
  }

  globalLastPoll = Date.now();
  return allVideos;
}

/**
 * Get current poller diagnostic info.
 */
export function getPollerDiagnostics(): {
  totalChannels: number;
  lastPoll: number;
  channels: Array<{
    channelId: string;
    categoryName: string;
    lastFetchedAt: number;
    knownIds: number;
    failures: number;
    coolingDown: boolean;
    isStale: boolean;
    backoffMs: number;
  }>;
} {
  ensureChannelStates();

  return {
    totalChannels: channelStates.size,
    lastPoll: globalLastPoll,
    channels: Array.from(channelStates.values()).map(s => ({
      channelId: s.channelId,
      categoryName: s.categoryName,
      lastFetchedAt: s.lastFetchedAt,
      knownIds: s.knownIds.size,
      failures: s.failures,
      coolingDown: s.coolingDown,
      isStale: s.isStale,
      backoffMs: s.backoffMs,
    })),
  };
}
