/**
 * Channel Configuration — YouTube RSS Sources
 *
 * All channels are fetched via their free RSS feed. No API key needed.
 * Add any YouTube channel ID here and it'll automatically appear in the feed.
 *
 * To find a channel ID:
 *   1. Go to the YouTube channel page
 *   2. The URL contains the ID: youtube.com/channel/UC...
 *   3. Or check page source for "channelId"
 */

export interface ChannelInfo {
  id: string;
  name: string;
  category: string;
  /** Higher priority channels appear first in feed */
  priority: number;
}

// ── RSS Channels — Free, Unlimited, No API Key ─────────────────────────────

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // Major Sports Networks (General / Multi-Sport)
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCiiljEMOGL7SUhPCrCO-MOg', name: 'ESPN',              category: 'general',    priority: 1 },
  { id: 'UCDjFJ-YdsJ3VT2zBOPOdqeA', name: 'Sky Sports',        category: 'football',   priority: 2 },
  { id: 'UC8-ZWfFvkRnN2Lfl8fFbK0A', name: 'Bleacher Report',   category: 'general',    priority: 3 },
  { id: 'UCqZQJ4D8bqG5wjNEiH7kyCQ', name: 'Fox Sports',        category: 'general',    priority: 6 },
  { id: 'UCFtK9FVk8cXihz9MW4SVy7w', name: 'The Athletic',      category: 'general',    priority: 9 },
  { id: 'UCJUCcJUeh0Cz2xyKwkw5Q1w', name: 'beIN SPORTS',       category: 'general',    priority: 10 },

  // ══════════════════════════════════════════════════════════════════════════
  // Football / Soccer
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UC6c1z7bA__85CIWZ_jpCK-Q', name: 'ESPN FC',                  category: 'football', priority: 11 },
  { id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League',            category: 'football', priority: 12 },
  { id: 'UCTv-XvfzLX3i4IGWAm4sbmA', name: 'LaLiga',                    category: 'football', priority: 13 },
  { id: 'UCs-dSOHbA_J4p76uYIUczWg', name: 'CBS Sports Golazo',         category: 'football', priority: 7 },

  // ══════════════════════════════════════════════════════════════════════════
  // Basketball
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',               category: 'basketball', priority: 4 },

  // ══════════════════════════════════════════════════════════════════════════
  // Cricket
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCAC3c_TJEj-9zVny-bSSIiA', name: 'BCCI',                    category: 'cricket',    priority: 14 },
  { id: 'UCt2JXOLNxqry7B_4rRZME3Q', name: 'ICC',                     category: 'cricket',    priority: 15 },
  { id: 'UC2naOExy27J5Qz3SO-w6xkQ', name: 'Cricket Australia',        category: 'cricket',    priority: 16 },
  { id: 'UCOkT6dccQ1vsnMFK1xJanmA', name: 'Fox Cricket',              category: 'cricket',    priority: 17 },

  // ══════════════════════════════════════════════════════════════════════════
  // MMA / Combat Sports
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCvgfXK4aHYobs0s2FhW6pNg', name: 'UFC',               category: 'mma',        priority: 5 },
  { id: 'UCAYlEoYwWfkF9nx3GekMwiw', name: 'DAZN Boxing',       category: 'mma',        priority: 8 },

  // ══════════════════════════════════════════════════════════════════════════
  // Tennis
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCbcxFkd6B9xUU54InHv4Tig', name: 'Tennis TV',               category: 'tennis',     priority: 18 },
  { id: 'UCDitdIjOjS9Myza9I21IqzQ', name: 'Tennis Channel',           category: 'tennis',     priority: 19 },

  // ══════════════════════════════════════════════════════════════════════════
  // Baseball
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCoLrcjPV5PbUrUyXq5mjc_A', name: 'MLB',                     category: 'baseball',   priority: 20 },

  // ══════════════════════════════════════════════════════════════════════════
  // American Football
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', name: 'NFL',                     category: 'football',   priority: 21 },

  // ══════════════════════════════════════════════════════════════════════════
  // Motorsport
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'UCB_qr75-ydFVKSF9Dmo6izg', name: 'Formula 1',               category: 'other',      priority: 22 },
];

// ── Legacy: Kept for backward compat ───────────────────────────────────────

export const WHITELISTED_CHANNELS: string[] = [
  'UCvgfXK4aHYobs0s2FhW6pNg', // UFC
  'UCWJ2lWNubArHWmf3FIHbfcQ', // NBA
];

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  'UCiiljEMOGL7SUhPCrCO-MOg': 'general',
  'UCDjFJ-YdsJ3VT2zBOPOdqeA': 'football',
  'UC8-ZWfFvkRnN2Lfl8fFbK0A': 'general',
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'basketball',
  'UCvgfXK4aHYobs0s2FhW6pNg': 'mma',
  'UCqZQJ4D8bqG5wjNEiH7kyCQ': 'general',
  'UCs-dSOHbA_J4p76uYIUczWg': 'football',
  'UCAYlEoYwWfkF9nx3GekMwiw': 'mma',
  'UCFtK9FVk8cXihz9MW4SVy7w': 'general',
  // New channels
  'UCJUCcJUeh0Cz2xyKwkw5Q1w': 'general',
  'UC6c1z7bA__85CIWZ_jpCK-Q': 'football',
  'UCG5qGWdu8nIRZqJ_GgDwQ-w': 'football',
  'UCTv-XvfzLX3i4IGWAm4sbmA': 'football',
  'UCAC3c_TJEj-9zVny-bSSIiA': 'cricket',
  'UCt2JXOLNxqry7B_4rRZME3Q': 'cricket',
  'UC2naOExy27J5Qz3SO-w6xkQ': 'cricket',
  'UCOkT6dccQ1vsnMFK1xJanmA': 'cricket',
  'UCbcxFkd6B9xUU54InHv4Tig': 'tennis',
  'UCDitdIjOjS9Myza9I21IqzQ': 'tennis',
  'UCoLrcjPV5PbUrUyXq5mjc_A': 'baseball',
  'UCDVYQ4Zhbm3S2dlz7P1GBDg': 'football',
  'UCB_qr75-ydFVKSF9Dmo6izg': 'other',
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

// ── Quality Thresholds (used by legacy quality-filter.ts) ──────────────────

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
export const MIN_TITLE_LENGTH = 15;
export const MAX_TITLE_LENGTH = 120;
