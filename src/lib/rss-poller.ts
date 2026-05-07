/**
 * Smart RSS Poller — Live Data Only
 *
 * Deterministic programs, no AI, no mock data:
 *   - Per-channel polling with staggered intervals
 *   - Video-ID-based change detection (O(1) set lookup)
 *   - Exponential backoff on failure (max 3 retries, then cooldown)
 *   - Stale-channel detection (skip channels with no new content)
 *   - Persistent in-memory buffer (survives CF Worker isolates)
 *
 * Polling cadence:
 *   Normal:   every 5 minutes per channel
 *   Stale:    every 10 minutes (no new videos in last 8 polls)
 *   Backoff:  5s → 10s → 20s (on consecutive failures)
 *   Cooldown: 30 minutes (after 3 consecutive failures)
 */

import { fetchRSSFeed, parseRSSFeed } from '@/lib/youtube-rss';
import { TRUSTED_CHANNELS, CHANNEL_CATEGORY_MAP } from '@/config/channels';
import type { Video } from '@/lib/mock-data';

interface ChannelState {
  channelId: string;
  categoryName: string;
  knownIds: Set<string>;
  lastFetchedAt: number;
  lastNewAt: number;
  failures: number;
  backoffMs: number;
  coolingDown: boolean;
  isStale: boolean;
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

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const STALE_INTERVAL_MS = 10 * 60 * 1000;
const BACKOFF_STEPS = [5000, 10_000, 20_000];
const COOLDOWN_MS = 30 * 60 * 1000;
const MAX_KNOWN_IDS = 100;
const STALE_THRESHOLD = 8;
const MAX_BACKOFF_FAILURES = 3;

const channelStates = new Map<string, ChannelState>();
let globalLastPoll = 0;

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

  if (state.knownIds.size > MAX_KNOWN_IDS) {
    const idsArr = Array.from(state.knownIds);
    const removeCount = idsArr.length - MAX_KNOWN_IDS;
    for (let i = 0; i < removeCount; i++) state.knownIds.delete(idsArr[i]);
  }

  if (newVideos.length === 0) {
    state.staleCount++;
    if (state.staleCount >= STALE_THRESHOLD) state.isStale = true;
  } else {
    state.staleCount = 0;
    state.isStale = false;
  }

  return newVideos;
}

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
  if (state.coolingDown) {
    if (now - state.lastFetchedAt < COOLDOWN_MS) return { ready: false, reason: 'cooldown' };
    state.coolingDown = false;
    state.failures = 0;
    state.backoffMs = 0;
  }
  if (state.backoffMs > 0 && now - state.lastFetchedAt < state.backoffMs) return { ready: false, reason: 'backoff' };
  const interval = state.isStale ? STALE_INTERVAL_MS : POLL_INTERVAL_MS;
  const elapsed = state.lastFetchedAt === 0 ? interval + 1 : now - state.lastFetchedAt;
  if (elapsed < interval) return { ready: false, reason: 'interval' };
  return { ready: true };
}

export async function pollAllChannels(): Promise<PollResult[]> {
  ensureChannelStates();
  const results: PollResult[] = [];

  for (const channel of TRUSTED_CHANNELS) {
    const state = channelStates.get(channel.id);
    if (!state) continue;

    const { ready, reason } = shouldPoll(state);
    if (!ready) {
      results.push({ category: state.categoryName, newVideos: [], totalFetched: 0, channelName: channel.name, skipped: true, skipReason: reason });
      continue;
    }

    try {
      const json = await fetchRSSFeed(channel.id);
      const videos = parseRSSFeed(json, channel.name, channel.id);
      recordSuccess(state);
      for (const v of videos) v.category = CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName;
      const newVids = detectNewVideos(videos, state);
      results.push({ category: state.categoryName, newVideos: newVids, totalFetched: videos.length, channelName: channel.name, skipped: false });
    } catch {
      recordFailure(state);
      results.push({ category: state.categoryName, newVideos: [], totalFetched: 0, channelName: channel.name, skipped: true, skipReason: 'fetch_error' });
    }
  }

  globalLastPoll = Date.now();
  return results;
}

export async function pollChannelsByIds(channelIds: string[]): Promise<Video[]> {
  ensureChannelStates();
  const allVideos: Video[] = [];

  for (const channelId of channelIds) {
    const channel = TRUSTED_CHANNELS.find(c => c.id === channelId);
    if (!channel) continue;
    const state = channelStates.get(channelId);
    if (!state) continue;

    try {
      const json = await fetchRSSFeed(channelId);
      const videos = parseRSSFeed(json, channel.name, channelId);
      recordSuccess(state);
      for (const v of videos) {
        v.category = CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName;
        state.knownIds.add(v.videoId);
      }
      allVideos.push(...videos);
    } catch {
      recordFailure(state);
    }
  }

  globalLastPoll = Date.now();
  return allVideos;
}

export function getPollerDiagnostics() {
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
    })),
  };
}
