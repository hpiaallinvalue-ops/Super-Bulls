/**
 * Channel Configuration — YouTube RSS Sources
 *
 * DESIGN PRINCIPLES:
 *   1. Category Specialization — every channel specializes in ONE sport.
 *      No general/multi-sport channels. Each category pulls from its own
 *      dedicated sources, so classification is deterministic, not heuristic.
 *   2. Free & Reputable — all sources use free YouTube RSS feeds.
 *      Channels are official league/team bodies or credible networks.
 *   3. English Only — content must be primarily in English.
 *
 * RSS URL format: https://www.youtube.com/feeds/videos.xml?channel_id={ID}
 * No API key needed. No quota. Completely free.
 *
 * To add a new channel:
 *   1. Go to the YouTube channel page
 *   2. The URL contains the ID: youtube.com/channel/UC...
 *   3. Add it under the correct category below
 */

export interface ChannelInfo {
  id: string;
  name: string;
  /** Must match a key in CATEGORY_RULES (categories.ts) or 'other' */
  category: string;
  /** Lower = fetched first; used as stable sort key */
  priority: number;
}

// ── Category-Specialized RSS Channels ─────────────────────────────────────

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Football / Soccer
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCDjFJ-YdsJ3VT2zBOPOdqeA', name: 'Sky Sports Football',     category: 'Football',  priority: 1 },
  { id: 'UC6c1z7bA__85CIWZ_jpCK-Q', name: 'ESPN FC',                category: 'Football',  priority: 2 },
  { id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League',          category: 'Football',  priority: 3 },
  { id: 'UCTv-XvfzLX3i4IGWAm4sbmA', name: 'LaLiga',                  category: 'Football',  priority: 4 },
  { id: 'UCs-dSOHbA_J4p76uYIUczWg', name: 'CBS Sports Golazo',       category: 'Football',  priority: 5 },

  // ═══════════════════════════════════════════════════════════════════════
  // Basketball
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',                     category: 'Basketball', priority: 1 },

  // ═══════════════════════════════════════════════════════════════════════
  // Cricket
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCAC3c_TJEj-9zVny-bSSIiA', name: 'BCCI',                    category: 'Cricket',    priority: 1 },
  { id: 'UCt2JXOLNxqry7B_4rRZME3Q', name: 'ICC',                     category: 'Cricket',    priority: 2 },
  { id: 'UC2naOExy27J5Qz3SO-w6xkQ', name: 'Cricket Australia',        category: 'Cricket',    priority: 3 },
  { id: 'UCOkT6dccQ1vsnMFK1xJanmA', name: 'Fox Cricket',              category: 'Cricket',    priority: 4 },

  // ═══════════════════════════════════════════════════════════════════════
  // MMA / Combat Sports
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCvgfXK4aHYobs0s2FhW6pNg', name: 'UFC',                     category: 'MMA',        priority: 1 },
  { id: 'UCAYlEoYwWfkF9nx3GekMwiw', name: 'DAZN Boxing',             category: 'MMA',        priority: 2 },

  // ═══════════════════════════════════════════════════════════════════════
  // Tennis
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCbcxFkd6B9xUU54InHv4Tig', name: 'Tennis TV',               category: 'Tennis',     priority: 1 },
  { id: 'UCDitdIjOjS9Myza9I21IqzQ', name: 'Tennis Channel',           category: 'Tennis',     priority: 2 },

  // ═══════════════════════════════════════════════════════════════════════
  // Baseball
  // ═══════════════════════════════════════════════════════════════════════
  { id: 'UCoLrcjPV5PbUrUyXq5mjc_A', name: 'MLB',                     category: 'Baseball',   priority: 1 },
];

// ── Legacy: Kept for backward compat ───────────────────────────────────────

export const WHITELISTED_CHANNELS: string[] = [
  'UCvgfXK4aHYobs0s2FhW6pNg', // UFC
  'UCWJ2lWNubArHWmf3FIHbfcQ', // NBA
];

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  // Football
  'UCDjFJ-YdsJ3VT2zBOPOdqeA': 'Football',
  'UC6c1z7bA__85CIWZ_jpCK-Q': 'Football',
  'UCG5qGWdu8nIRZqJ_GgDwQ-w': 'Football',
  'UCTv-XvfzLX3i4IGWAm4sbmA': 'Football',
  'UCs-dSOHbA_J4p76uYIUczWg': 'Football',
  // Basketball
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'Basketball',
  // Cricket
  'UCAC3c_TJEj-9zVny-bSSIiA': 'Cricket',
  'UCt2JXOLNxqry7B_4rRZME3Q': 'Cricket',
  'UC2naOExy27J5Qz3SO-w6xkQ': 'Cricket',
  'UCOkT6dccQ1vsnMFK1xJanmA': 'Cricket',
  // MMA
  'UCvgfXK4aHYobs0s2FhW6pNg': 'MMA',
  'UCAYlEoYwWfkF9nx3GekMwiw': 'MMA',
  // Tennis
  'UCbcxFkd6B9xUU54InHv4Tig': 'Tennis',
  'UCDitdIjOjS9Myza9I21IqzQ': 'Tennis',
  // Baseball
  'UCoLrcjPV5PbUrUyXq5mjc_A': 'Baseball',
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

// ── Quality Thresholds (used by legacy quality-filter.ts) ──────────────────

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
export const MIN_TITLE_LENGTH = 15;
export const MAX_TITLE_LENGTH = 120;
