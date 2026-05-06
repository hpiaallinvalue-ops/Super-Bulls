/**
 * Ranking System — O(n log n) Precomputed Normalization
 *
 * Score = (Views × 0.4) + (Likes × 0.2) + (Comments × 0.1) + (Recency × 0.3)
 *
 * Optimization: Normalization values are precomputed ONCE per dataset,
 * not recomputed per comparison. This reduces from O(n²) to O(n).
 */

import type { Video } from './mock-data';

// ── Weights ─────────────────────────────────────────────────────────────────

const WEIGHT_VIEWS = 0.4;
const WEIGHT_LIKES = 0.2;
const WEIGHT_COMMENTS = 0.1;
const WEIGHT_RECENCY = 0.3;

const RECENCY_WINDOW_HOURS = 720; // 30 days

// ── Normalization (vectorized — single pass) ────────────────────────────────

interface NormalizationFactors {
  views: { min: number; max: number; range: number };
  likes: { min: number; max: number; range: number };
  comments: { min: number; max: number; range: number };
}

function computeNormalizationFactors(videos: Video[]): NormalizationFactors {
  let viewsMin = Infinity, viewsMax = -Infinity;
  let likesMin = Infinity, likesMax = -Infinity;
  let commentsMin = Infinity, commentsMax = -Infinity;

  for (const v of videos) {
    if (v.viewCount < viewsMin) viewsMin = v.viewCount;
    if (v.viewCount > viewsMax) viewsMax = v.viewCount;
    if (v.likeCount < likesMin) likesMin = v.likeCount;
    if (v.likeCount > likesMax) likesMax = v.likeCount;
    if (v.commentCount < commentsMin) commentsMin = v.commentCount;
    if (v.commentCount > commentsMax) commentsMax = v.commentCount;
  }

  return {
    views: { min: viewsMin, max: viewsMax, range: viewsMax - viewsMin || 1 },
    likes: { min: likesMin, max: likesMax, range: likesMax - likesMin || 1 },
    comments: { min: commentsMin, max: commentsMax, range: commentsMax - commentsMin || 1 },
  };
}

function normalizeValue(value: number, min: number, range: number): number {
  return range === 0 ? 0.5 : (value - min) / range;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute ranking scores for ALL videos in one pass.
 * Returns a Map<videoId, score> for O(1) lookup.
 *
 * Time complexity: O(n) for normalization + O(n) for scoring = O(n)
 */
export function computeRankingScores(videos: Video[]): Map<string, number> {
  const scores = new Map<string, number>();
  if (videos.length === 0) return scores;

  const factors = computeNormalizationFactors(videos);
  const now = Date.now();

  for (const video of videos) {
    const normViews = normalizeValue(video.viewCount, factors.views.min, factors.views.range);
    const normLikes = normalizeValue(video.likeCount, factors.likes.min, factors.likes.range);
    const normComments = normalizeValue(video.commentCount, factors.comments.min, factors.comments.range);

    // Recency: 1.0 for just published, 0.0 for 30+ days old
    const hoursSince = (now - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, Math.min(1, 1 - hoursSince / RECENCY_WINDOW_HOURS));

    const score =
      normViews * WEIGHT_VIEWS +
      normLikes * WEIGHT_LIKES +
      normComments * WEIGHT_COMMENTS +
      recency * WEIGHT_RECENCY;

    scores.set(video.videoId, score);
  }

  return scores;
}

/**
 * Compute score for a single video within context of a dataset.
 * Uses precomputed factors if available, otherwise computes on the fly.
 */
export function computeRankingScore(video: Video, allVideos: Video[]): number {
  const scores = computeRankingScores(allVideos);
  return scores.get(video.videoId) || 0;
}

/**
 * Sort videos by ranking score (highest first).
 * Uses precomputed O(n) scoring + O(n log n) sort.
 */
export function rankVideos(videos: Video[]): Video[] {
  if (videos.length <= 1) return [...videos];

  const scores = computeRankingScores(videos);

  return [...videos].sort((a, b) => {
    const scoreA = scores.get(a.videoId) || 0;
    const scoreB = scores.get(b.videoId) || 0;
    return scoreB - scoreA;
  });
}

/**
 * Sort videos by publish date (newest first).
 */
export function sortByLatest(videos: Video[]): Video[] {
  return [...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
