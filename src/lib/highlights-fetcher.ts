/**
 * Highlights Fetcher — Systematic sports highlight acquisition
 *
 * Unlike general sports news, highlights require targeted queries with
 * sport-specific terminology. This module provides a deterministic,
 * structured approach to fetching highlights for each sport.
 *
 * Strategy per sport:
 *   - Use official league/team channel IDs when available
 *   - Use precise highlight-specific search terms
 *   - Apply aggressive recency filter (highlights expire fast)
 *   - Prioritize short-form content (< 10 min) for highlights
 */

import type { Video } from './mock-data';
import { quotaManager } from './api-quota';
import { searchSportsVideos, hasApiKey } from './youtube-api';
import { classifyVideo } from './category-rules';

// ── Highlight Search Playbook ───────────────────────────────────────────────
// Each sport has a deterministic set of highlight-specific queries.
// Ordered by expected quality: official sources first, then general.

interface HighlightQuery {
  query: string;
  priority: number; // Lower = higher priority (fetched first)
  maxAgeHours: number; // Max age for highlights in this category
}

const HIGHLIGHT_PLAYBOOK: Record<string, HighlightQuery[]> = {
  Football: [
    { query: 'football highlights today goals', priority: 1, maxAgeHours: 24 },
    { query: 'premier league highlights 2025', priority: 2, maxAgeHours: 48 },
    { query: 'champions league highlights', priority: 3, maxAgeHours: 48 },
    { query: 'La Liga Serie A Bundesliga highlights', priority: 4, maxAgeHours: 72 },
  ],
  Basketball: [
    { query: 'NBA highlights today 2025', priority: 1, maxAgeHours: 24 },
    { query: 'NBA best plays dunks', priority: 2, maxAgeHours: 48 },
    { query: 'basketball highlights NCAA', priority: 3, maxAgeHours: 72 },
  ],
  Cricket: [
    { query: 'cricket highlights today 2025', priority: 1, maxAgeHours: 24 },
    { query: 'IPL highlights match today', priority: 2, maxAgeHours: 48 },
    { query: 'T20 cricket best shots sixes', priority: 3, maxAgeHours: 72 },
  ],
  MMA: [
    { query: 'UFC highlights knockout 2025', priority: 1, maxAgeHours: 48 },
    { query: 'MMA fight highlights best knockouts', priority: 2, maxAgeHours: 72 },
    { query: 'UFC fight night highlights', priority: 3, maxAgeHours: 96 },
  ],
  Tennis: [
    { query: 'tennis highlights best points 2025', priority: 1, maxAgeHours: 48 },
    { query: 'ATP WTA match highlights', priority: 2, maxAgeHours: 72 },
    { query: 'grand slam highlights', priority: 3, maxAgeHours: 96 },
  ],
  Baseball: [
    { query: 'MLB highlights home runs 2025', priority: 1, maxAgeHours: 24 },
    { query: 'baseball best plays highlights', priority: 2, maxAgeHours: 48 },
  ],
  Other: [
    { query: 'sports highlights today 2025', priority: 1, maxAgeHours: 24 },
    { query: 'F1 highlights NFL NHL', priority: 2, maxAgeHours: 48 },
  ],
};

// ── Highlights API ──────────────────────────────────────────────────────────

export interface HighlightFetchResult {
  highlights: Video[];
  sport: string;
  source: 'api' | 'mock';
  queriesExecuted: number;
}

/**
 * Fetch highlights for a specific sport.
 * Uses the playbook queries in priority order, stopping when quota runs low.
 *
 * @param sport - Sport category name
 * @param maxResults - Maximum number of highlight videos to return
 */
export async function fetchHighlights(
  sport: string,
  maxResults: number = 12
): Promise<HighlightFetchResult> {
  if (!hasApiKey()) {
    return { highlights: [], sport, source: 'mock', queriesExecuted: 0 };
  }

  const playbook = HIGHLIGHT_PLAYBOOK[sport] || HIGHLIGHT_PLAYBOOK.Other;
  const sortedQueries = [...playbook].sort((a, b) => a.priority - b.priority);

  let allHighlights: Video[] = [];
  let queriesExecuted = 0;

  for (const entry of sortedQueries) {
    // Stop if we have enough results
    if (allHighlights.length >= maxResults) break;

    // Stop if quota is running low
    if (!quotaManager.canProceed('search', 'P1_HIGH')) break;

    try {
      const result = await searchSportsVideos(entry.query);
      quotaManager.recordUsage('search', 'P1_HIGH');
      queriesExecuted++;

      // Filter by recency
      const freshVideos = result.videos.filter(v => {
        const hoursSince = (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60);
        return hoursSince <= entry.maxAgeHours;
      });

      // Filter by duration preference (highlights are usually short)
      const shortVideos = freshVideos.filter(v => {
        if (!v.duration || v.duration === '0:00') return true; // Unknown duration, keep it
        const parts = v.duration.split(':').map(Number);
        const minutes = parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0];
        return minutes <= 15; // Prefer videos under 15 minutes
      });

      allHighlights.push(...shortVideos);
    } catch {
      // Continue to next query on failure
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped = allHighlights.filter(v => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });

  // Sort by recency (newest first for highlights)
  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return {
    highlights: deduped.slice(0, maxResults),
    sport,
    source: 'api',
    queriesExecuted,
  };
}

/**
 * Fetch highlights across ALL sports.
 * Useful for a "Top Highlights" landing section.
 *
 * Budgets quota evenly across sports.
 */
export async function fetchAllHighlights(
  maxPerSport: number = 4
): Promise<HighlightFetchResult[]> {
  const sports = Object.keys(HIGHLIGHT_PLAYBOOK);
  const results: HighlightFetchResult[] = [];

  for (const sport of sports) {
    // Check if we can afford more searches
    if (!quotaManager.canProceed('search', 'P2_STANDARD')) break;

    const result = await fetchHighlights(sport, maxPerSport);
    results.push(result);
  }

  return results;
}
