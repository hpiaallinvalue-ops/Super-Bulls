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
  // Major Sports Networks
  { id: 'UCiiljEMOGL7SUhPCrCO-MOg', name: 'ESPN',            category: 'general',    priority: 1 },
  { id: 'UCDjFJ-YdsJ3VT2zBOPOdqeA', name: 'Sky Sports',      category: 'football',   priority: 2 },
  { id: 'UC8-ZWfFvkRnN2Lfl8fFbK0A', name: 'Bleacher Report', category: 'general',    priority: 3 },
  { id: 'UCqZQJ4D8bqG5wjNEiH7kyCQ', name: 'Fox Sports',      category: 'general',    priority: 6 },

  // League Official Channels
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',             category: 'basketball', priority: 4 },
  { id: 'UCvgfXK4aHYobs0s2FhW6pNg', name: 'UFC',             category: 'mma',        priority: 5 },

  // Football / Soccer
  { id: 'UCs-dSOHbA_J4p76uYIUczWg', name: 'CBS Sports Golazo', category: 'football', priority: 7 },

  // Combat Sports
  { id: 'UCAYlEoYwWfkF9nx3GekMwiw', name: 'DAZN Boxing',     category: 'mma',        priority: 8 },

  // Multi-Sport
  { id: 'UCFtK9FVk8cXihz9MW4SVy7w', name: 'The Athletic',    category: 'general',    priority: 9 },
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
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

// ── Quality Thresholds (used by legacy quality-filter.ts) ──────────────────

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
export const MIN_TITLE_LENGTH = 15;
export const MAX_TITLE_LENGTH = 120;
