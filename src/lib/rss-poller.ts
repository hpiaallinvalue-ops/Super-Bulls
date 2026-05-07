/**
 * Smart RSS Poller — Live Data Only
 *
 * Deterministic programs, no AI, no mock data:
 *   - Per-channel polling with staggered intervals
 *   - Video-ID-based change detection (O(1) set lookup)
 *   - Exponential backoff on failure (max 3 retries, then cooldown)
 *   - Stale-channel detection (skip channels with no new content)
 *   - Parallel fetching with concurrency control
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
import { classifyVideo } from '@/lib/category-rules';
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
const MAX_CONCURRENCY = 4; // Parallel fetch up to 4 channels at once

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

/**
 * Fetch a single channel and return its videos + poll result.
 */
async function pollSingleChannel(channel: { id: string; name: string; category: string }): Promise<PollResult> {
  const state = channelStates.get(channel.id);
  if (!state) {
    return { category: channel.category, newVideos: [], totalFetched: 0, channelName: channel.name, skipped: true, skipReason: 'no_state' };
  }

  const { ready, reason } = shouldPoll(state);
  if (!ready) {
    return { category: state.categoryName, newVideos: [], totalFetched: 0, channelName: channel.name, skipped: true, skipReason: reason };
  }

  try {
    const json = await fetchRSSFeed(channel.id);
    const videos = parseRSSFeed(json, channel.name, channel.id);
    recordSuccess(state);
    for (const v of videos) {
      const classified = classifyVideo(v.title, v.description);
      v.category = classified !== 'Other' ? classified : (CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName);
    }
    const newVids = detectNewVideos(videos, state);
    return { category: state.categoryName, newVideos: newVids, totalFetched: videos.length, channelName: channel.name, skipped: false };
  } catch {
    recordFailure(state);
    return { category: state.categoryName, newVideos: [], totalFetched: 0, channelName: channel.name, skipped: true, skipReason: 'fetch_error' };
  }
}

/**
 * Run promises with concurrency limit.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
      const index = executing.indexOf(promise as unknown as Promise<void>);
      if (index > -1) executing.splice(index, 1);
    });

    executing.push(promise as unknown as Promise<void>);

    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export async function pollAllChannels(): Promise<PollResult[]> {
  ensureChannelStates();

  const tasks = TRUSTED_CHANNELS.map(channel => () => pollSingleChannel(channel));
  const results = await runWithConcurrency(tasks, MAX_CONCURRENCY);

  globalLastPoll = Date.now();
  return results;
}

export async function pollChannelsByIds(channelIds: string[]): Promise<Video[]> {
  ensureChannelStates();
  const allVideos: Video[] = [];

  // Build list of channels to poll (filter out unknown IDs)
  const channelsToPoll: { id: string; name: string; category: string }[] = [];
  for (const channelId of channelIds) {
    const channel = TRUSTED_CHANNELS.find(c => c.id === channelId);
    if (channel) channelsToPoll.push(channel);
  }

  // Poll in parallel with concurrency limit for speed
  const tasks = channelsToPoll.map(channel => async (): Promise<Video[]> => {
    const state = channelStates.get(channel.id);
    if (!state) return [];

    try {
      const json = await fetchRSSFeed(channel.id);
      const videos = parseRSSFeed(json, channel.name, channel.id);
      recordSuccess(state);
      for (const v of videos) {
        const classified = classifyVideo(v.title, v.description);
        v.category = classified !== 'Other' ? classified : (CHANNEL_CATEGORY_MAP[v.channelId] || state.categoryName);
        state.knownIds.add(v.videoId);
      }
      return videos;
    } catch {
      recordFailure(state);
      return [];
    }
  });

  const videoResults = await runWithConcurrency(tasks, MAX_CONCURRENCY);
  for (const vids of videoResults) {
    allVideos.push(...vids);
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
