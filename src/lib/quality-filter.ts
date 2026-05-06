/**
 * Quality Filter — Multi-Stage Content Quality Gates
 *
 * Every video must pass through 4 gates before reaching the user:
 *
 *   GATE 1: CHANNEL ELIGIBILITY — Subscriber count or trusted status
 *   GATE 2: VIEW THRESHOLD    — Minimum engagement required
 *   GATE 3: RECENCY           — Content must be fresh (within 30 days)
 *   GATE 4: TITLE QUALITY     — No spam, clickbait, or irrelevant content
 *
 * Trusted sources (ESPN, Sky Sports, Bleacher Report, NBA, UFC) bypass
 * gates 1-3 but still must pass gate 4 (title quality).
 */

import { TRUSTED_CHANNEL_IDS, WHITELISTED_CHANNELS, MIN_SUBSCRIBERS, MIN_AVG_VIEWS, MAX_DAYS_INACTIVE } from '@/config/channels';

// ── Spam / Clickbait Detection ──────────────────────────────────────────────
// Titles matching these patterns are flagged as low quality.

const SPAM_PATTERNS = [
  /\b(free\s*(money|gift|iphone|crypto|nft))\b/i,
  /\b(click\s*(here|now|link))\b/i,
  /\b(subscribe\s*and\s*win)\b/i,
  /\b(watch\s*until\s*the\s*end)\b/i,
  /\b(not\s*clickbait)\b/i,
  /\b(shocking|you\s*won'?t?\s*believe)\b/i,
  /\b(\d{1,2}\s*(reasons|things|ways)\s*(you|to))\b/i,
  /[!]{3,}/,           // 3+ consecutive exclamation marks
  /\b(prank|gone\s*wrong|caught\s*on\s*camera)\b/i,
  /\b(100%(?:\s*real|.*legit))\b/i,
  /\b(earn?\s*\$?\d+\s*(per\s*(day|hour|week)))\b/i,
];

const MIN_TITLE_LENGTH = 15;
const MAX_TITLE_LENGTH = 120;

// ── Gate 1: Channel Eligibility ─────────────────────────────────────────────

export interface ChannelCheckResult {
  pass: boolean;
  reason?: string;
}

export function checkChannelEligibility(
  subscriberCount: number,
  channelId: string
): ChannelCheckResult {
  // Trusted channels always pass
  if (TRUSTED_CHANNEL_IDS.has(channelId)) {
    return { pass: true };
  }

  // Whitelisted channels always pass
  if (WHITELISTED_CHANNELS.includes(channelId)) {
    return { pass: true };
  }

  // Channel must have sufficient subscribers
  if (subscriberCount >= MIN_SUBSCRIBERS) {
    return { pass: true };
  }

  return {
    pass: false,
    reason: `Channel has ${subscriberCount.toLocaleString()} subscribers (minimum: ${MIN_SUBSCRIBERS.toLocaleString()})`,
  };
}

// ── Gate 2: View Threshold ─────────────────────────────────────────────────

export interface ViewCheckResult {
  pass: boolean;
  reason?: string;
}

export function checkViewThreshold(
  viewCount: number,
  channelId: string
): ViewCheckResult {
  // Trusted/whitelisted channels bypass view threshold
  if (TRUSTED_CHANNEL_IDS.has(channelId) || WHITELISTED_CHANNELS.includes(channelId)) {
    return { pass: true };
  }

  if (viewCount >= MIN_AVG_VIEWS) {
    return { pass: true };
  }

  return {
    pass: false,
    reason: `Video has ${viewCount.toLocaleString()} views (minimum: ${MIN_AVG_VIEWS.toLocaleString()})`,
  };
}

// ── Gate 3: Recency ────────────────────────────────────────────────────────

export interface RecencyCheckResult {
  pass: boolean;
  reason?: string;
  daysSince: number;
}

export function checkRecency(publishedAt: string): RecencyCheckResult {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysSince = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince <= MAX_DAYS_INACTIVE) {
    return { pass: true, daysSince };
  }

  return {
    pass: false,
    daysSince,
    reason: `Video is ${Math.floor(daysSince)} days old (maximum: ${MAX_DAYS_INACTIVE})`,
  };
}

// ── Gate 4: Title Quality ──────────────────────────────────────────────────

export interface TitleCheckResult {
  pass: boolean;
  reasons: string[];
}

export function checkTitleQuality(title: string): TitleCheckResult {
  const reasons: string[] = [];

  // Check minimum length
  if (title.length < MIN_TITLE_LENGTH) {
    reasons.push(`Title too short (${title.length} chars, minimum: ${MIN_TITLE_LENGTH})`);
  }

  // Check maximum length
  if (title.length > MAX_TITLE_LENGTH) {
    reasons.push(`Title too long (${title.length} chars, maximum: ${MAX_TITLE_LENGTH})`);
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(title)) {
      reasons.push(`Matches spam pattern: ${pattern.source}`);
      break; // One spam match is enough to flag
    }
  }

  // Check for all-caps titles (more than 70% uppercase = clickbait)
  const alphaChars = title.replace(/[^a-zA-Z]/g, '');
  if (alphaChars.length > 10) {
    const upperRatio = (alphaChars.match(/[A-Z]/g) || []).length / alphaChars.length;
    if (upperRatio > 0.7) {
      reasons.push('Title is mostly uppercase (clickbait indicator)');
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}

// ── Combined Quality Check (all 3 original gates) ──────────────────────────

export interface QualityCheckResult {
  pass: boolean;
  reasons: string[];
  gates: {
    channel: boolean;
    views: boolean;
    recency: boolean;
    title: boolean;
  };
}

export function checkVideoQuality(
  subscriberCount: number,
  viewCount: number,
  channelId: string,
  publishedAt: string
): QualityCheckResult {
  const reasons: string[] = [];

  const channelCheck = checkChannelEligibility(subscriberCount, channelId);
  const viewCheck = checkViewThreshold(viewCount, channelId);
  const recencyCheck = checkRecency(publishedAt);
  const titleCheck = checkTitleQuality(''); // Title checked separately

  if (!channelCheck.pass) reasons.push(channelCheck.reason || 'Channel not eligible');
  if (!viewCheck.pass) reasons.push(viewCheck.reason || 'Insufficient views');
  if (!recencyCheck.pass) reasons.push(recencyCheck.reason || 'Too old');

  // Trusted channels bypass gates 1-3
  const isTrusted = TRUSTED_CHANNEL_IDS.has(channelId) || WHITELISTED_CHANNELS.includes(channelId);

  return {
    pass: isTrusted || (channelCheck.pass && viewCheck.pass && recencyCheck.pass),
    reasons,
    gates: {
      channel: channelCheck.pass,
      views: viewCheck.pass,
      recency: recencyCheck.pass,
      title: titleCheck.pass,
    },
  };
}

/**
 * Run the full 4-gate quality check on a video.
 * This is the primary function the pipeline should use.
 */
export function runQualityGates(video: {
  title: string;
  viewCount: number;
  channelId: string;
  publishedAt: string;
  subscriberCount?: number;
}): QualityCheckResult {
  const result = checkVideoQuality(
    video.subscriberCount || 0,
    video.viewCount,
    video.channelId,
    video.publishedAt
  );

  // Always check title quality (even for trusted sources)
  const titleResult = checkTitleQuality(video.title);
  if (!titleResult.pass) {
    result.reasons.push(...titleResult.reasons);
    result.gates.title = false;
    // Trusted sources can bypass title check too (false positives possible)
    if (!TRUSTED_CHANNEL_IDS.has(video.channelId) && !WHITELISTED_CHANNELS.includes(video.channelId)) {
      result.pass = false;
    }
  } else {
    result.gates.title = true;
  }

  return result;
}
