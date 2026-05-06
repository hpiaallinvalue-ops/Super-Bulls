/**
 * Channel Configuration — Trusted Sources & Quality Thresholds
 *
 * Channel Tiers:
 *   TIER 1 (Trusted): ESPN, Sky Sports, Bleacher Report, NBA, UFC
 *           → Bypass ALL quality gates (channel, views, recency)
 *           → Only title quality checked
 *
 *   TIER 2 (Whitelisted): Additional sport-specific major channels
 *           → Bypass channel/view gates
 *           → Recency + title still checked
 *
 *   TIER 3 (Standard): Must pass ALL 4 quality gates
 */

export interface ChannelInfo {
  id: string;
  name: string;
  category: string;
  /** Higher priority channels are fetched first */
  priority: number;
}

// ── Tier 1: Trusted Sources (Always Pass) ────────────────────────────────────

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  { id: 'UCiiljEMOGL7SUhPCrCO-MOg', name: 'ESPN',            category: 'general',      priority: 1 },
  { id: 'UCDjFJ-YdsJ3VT2zBOPOdqeA', name: 'Sky Sports',      category: 'football',     priority: 2 },
  { id: 'UC8-ZWfFvkRnN2Lfl8fFbK0A', name: 'Bleacher Report', category: 'general',      priority: 3 },
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',             category: 'basketball',   priority: 4 },
  { id: 'UCvgfXK4aHYobs0s2FhW6pNg', name: 'UFC',             category: 'mma',          priority: 5 },
];

// ── Tier 2: Whitelisted (High-Priority Sources) ──────────────────────────────

export const WHITELISTED_CHANNELS: string[] = [
  'UCvgfXK4aHYobs0s2FhW6pNg', // UFC
  'UCWJ2lWNubArHWmf3FIHbfcQ', // NBA
];

// ── Channel → Category Mapping ──────────────────────────────────────────────
// Used to pre-classify videos from known channels.

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  'UCiiljEMOGL7SUhPCrCO-MOg': 'general',       // ESPN
  'UCDjFJ-YdsJ3VT2zBOPOdqeA': 'football',      // Sky Sports
  'UC8-ZWfFvkRnN2Lfl8fFbK0A': 'general',       // Bleacher Report
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'basketball',    // NBA
  'UCvgfXK4aHYobs0s2FhW6pNg': 'mma',           // UFC
};

// ── Derived Sets ────────────────────────────────────────────────────────────

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

// ── Quality Thresholds ──────────────────────────────────────────────────────

/** Minimum subscriber count for non-trusted channels */
export const MIN_SUBSCRIBERS = 100000;

/** Minimum average views per video for non-trusted channels */
export const MIN_AVG_VIEWS = 10000;

/** Maximum days since last upload for a channel to be considered "active" */
export const MAX_DAYS_INACTIVE = 30;

/** Minimum title length to prevent low-effort content */
export const MIN_TITLE_LENGTH = 15;

/** Maximum title length to prevent spam */
export const MAX_TITLE_LENGTH = 120;
