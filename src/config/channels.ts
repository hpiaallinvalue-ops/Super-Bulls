export interface ChannelInfo {
  id: string;
  name: string;
  category: string;
}

export const TRUSTED_CHANNELS: ChannelInfo[] = [
  { id: 'UCiiljEMOGL7SUhPCrCO-MOg', name: 'ESPN', category: 'general' },
  { id: 'UCDjFJ-YdsJ3VT2zBOPOdqeA', name: 'Sky Sports', category: 'football' },
  { id: 'UC8-ZWfFvkRnN2Lfl8fFbK0A', name: 'Bleacher Report', category: 'general' },
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA', category: 'basketball' },
  { id: 'UCvgfXK4aHYobs0s2FhW6pNg', name: 'UFC', category: 'mma' },
];

export const WHITELISTED_CHANNELS: string[] = [
  'UCvgfXK4aHYobs0s2FhW6pNg',
  'UCWJ2lWNubArHWmf3FIHbfcQ',
];

export const CHANNEL_CATEGORY_MAP: Record<string, string> = {
  'UCiiljEMOGL7SUhPCrCO-MOg': 'general',
  'UCDjFJ-YdsJ3VT2zBOPOdqeA': 'football',
  'UC8-ZWfFvkRnN2Lfl8fFbK0A': 'general',
  'UCWJ2lWNubArHWmf3FIHbfcQ': 'basketball',
  'UCvgfXK4aHYobs0s2FhW6pNg': 'mma',
};

export const TRUSTED_CHANNEL_IDS = new Set(TRUSTED_CHANNELS.map(c => c.id));

export const MIN_SUBSCRIBERS = 100000;
export const MIN_AVG_VIEWS = 10000;
export const MAX_DAYS_INACTIVE = 30;
