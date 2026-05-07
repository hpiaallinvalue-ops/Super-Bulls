/**
 * Channel Configuration — Verified YouTube RSS Sources
 *
 * All channels have been verified to:
 *   - Return live data via rss2json.com proxy
 *   - Allow video embedding on third-party sites
 *   - Publish primarily English content
 *   - Update frequently (daily or more)
 *
 * Categories:
 *   Specialized channels map to one sport via CHANNEL_CATEGORY_MAP.
 *   Multi-sport channels (ESPN, Bleacher Report, NBC Sports) are
 *   classified per-video by the keyword matcher in category-rules.ts.
 *
 * Removed (embed restrictions): LaLiga, Premier League, NFL, BCCI, Fox Cricket
 */

export interface ChannelInfo {
  id: string;
  name: string;
  category: string;
  priority: number;
}

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  // Football / Soccer
  { id: 'UC6c1z7bA__85CIWZ_jpCK-Q', name: 'ESPN FC',            category: 'Football',    priority: 1 },
  { id: 'UCbWUEnTRHb3bRdrnovq8iuA', name: 'Football Daily',     category: 'Football',    priority: 2 },

  // Basketball
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',               category: 'Basketball',  priority: 1 },
  { id: 'UC6B6sz0_bhLLjE5rP3bFjJw', name: 'House of Highlights', category: 'Basketball', priority: 2 },

  // Cricket (English)
  { id: 'UC2naOExy27J5Qz3SO-w6xkQ', name: 'Cricket Australia', category: 'Cricket',     priority: 1 },

  // MMA / Combat Sports
  { id: 'UCvgfXK4nTYKudb0rFR6noLA', name: 'UFC',               category: 'MMA',          priority: 1 },

  // Tennis
  { id: 'UCDitdIjOjS9Myza9I21IqzQ', name: 'Tennis Channel',    category: 'Tennis',       priority: 1 },

  // Baseball
  { id: 'UCoLrcjPV5PbUrUyXq5mjc_A', name: 'MLB',               category: 'Baseball',     priority: 1 },

  // Multi-sport (per-video classification via keyword matcher)
  { id: 'UCiWLfSweyRNmLpgEHekhoAg', name: 'ESPN',              category: 'Other',        priority: 3 },
  { id: 'UC9-OpMMVoNP5o10_Iyq7Ndw', name: 'Bleacher Report',   category: 'Other',        priority: 4 },
  { id: 'UCqZQlzSHbVJrwrn5XvzrzcA', name: 'NBC Sports',        category: 'Other',        priority: 5 },
];

export const WHITELISTED_CHANNELS: string[] = [
  'UCvgfXK4nTYKudb0rFR6noLA', // UFC
  'UCWJ2lWNubArHWmf3FIHbfcQ', // NBA
  'UC6B6sz0_bhLLjE5rP3bFjJw', // House of Highlights
];

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  // Football
  'UC6c1z7bA__85CIWZ_jpCK-Q': 'Football',
  'UCbWUEnTRHb3bRdrnovq8iuA': 'Football',
  // Basketball
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'Basketball',
  'UC6B6sz0_bhLLjE5rP3bFjJw': 'Basketball',
  // Cricket
  'UC2naOExy27J5Qz3SO-w6xkQ': 'Cricket',
  // MMA
  'UCvgfXK4nTYKudb0rFR6noLA': 'MMA',
  // Tennis
  'UCDitdIjOjS9Myza9I21IqzQ': 'Tennis',
  // Baseball
  'UCoLrcjPV5PbUrUyXq5mjc_A': 'Baseball',
  // Multi-sport: intentionally NOT mapped here — keyword matcher handles per-video
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
export const MIN_TITLE_LENGTH = 15;
export const MAX_TITLE_LENGTH = 120;
