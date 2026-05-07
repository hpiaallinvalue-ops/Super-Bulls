/**
 * Channel Configuration — Verified YouTube RSS Sources
 *
 * Every channel has been verified to return live data via rss2json.com proxy.
 * Category specialization is enforced: each channel maps to ONE sport.
 * All content is in English. All sources are free.
 */

export interface ChannelInfo {
  id: string;
  name: string;
  category: string;
  priority: number;
}

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  // Football / Soccer
  { id: 'UC6c1z7bA__85CIWZ_jpCK-Q', name: 'ESPN FC',            category: 'Football',  priority: 1 },
  { id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League',      category: 'Football',  priority: 2 },
  { id: 'UCTv-XvfzLX3i4IGWAm4sbmA', name: 'LaLiga',              category: 'Football',  priority: 3 },
  { id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', name: 'NFL',                 category: 'Football',  priority: 4 },

  // Basketball
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA',                 category: 'Basketball', priority: 1 },

  // Cricket
  { id: 'UCAC3c_TJEj-9zVny-bSSIiA', name: 'BCCI',                category: 'Cricket',    priority: 1 },
  { id: 'UC2naOExy27J5Qz3SO-w6xkQ', name: 'Cricket Australia',   category: 'Cricket',    priority: 2 },
  { id: 'UCOkT6dccQ1vsnMFK1xJanmA', name: 'Fox Cricket',         category: 'Cricket',    priority: 3 },

  // MMA / Combat Sports
  { id: 'UC7_YxT-KID8kRbqZo7MyscQ', name: 'UFC',                 category: 'MMA',        priority: 1 },

  // Tennis
  { id: 'UCDitdIjOjS9Myza9I21IqzQ', name: 'Tennis Channel',      category: 'Tennis',     priority: 1 },

  // Baseball
  { id: 'UCoLrcjPV5PbUrUyXq5mjc_A', name: 'MLB',                 category: 'Baseball',   priority: 1 },
];

export const WHITELISTED_CHANNELS: string[] = [
  'UC7_YxT-KID8kRbqZo7MyscQ', // UFC
  'UCWJ2lWNubArHWmf3FIHbfcQ', // NBA
];

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  'UC6c1z7bA__85CIWZ_jpCK-Q': 'Football',
  'UCG5qGWdu8nIRZqJ_GgDwQ-w': 'Football',
  'UCTv-XvfzLX3i4IGWAm4sbmA': 'Football',
  'UCDVYQ4Zhbm3S2dlz7P1GBDg': 'Football',
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'Basketball',
  'UCAC3c_TJEj-9zVny-bSSIiA': 'Cricket',
  'UC2naOExy27J5Qz3SO-w6xkQ': 'Cricket',
  'UCOkT6dccQ1vsnMFK1xJanmA': 'Cricket',
  'UC7_YxT-KID8kRbqZo7MyscQ': 'MMA',
  'UCDitdIjOjS9Myza9I21IqzQ': 'Tennis',
  'UCoLrcjPV5PbUrUyXq5mjc_A': 'Baseball',
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
export const MIN_TITLE_LENGTH = 15;
export const MAX_TITLE_LENGTH = 120;
