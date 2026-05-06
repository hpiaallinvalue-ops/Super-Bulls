import { TRUSTED_CHANNEL_IDS, WHITELISTED_CHANNELS, MIN_SUBSCRIBERS, MIN_AVG_VIEWS } from '@/config/channels';

export interface QualityCheckResult {
  pass: boolean;
  reasons: string[];
}

export function checkVideoQuality(
  subscriberCount: number,
  viewCount: number,
  channelId: string,
  publishedAt: string
): QualityCheckResult {
  const reasons: string[] = [];

  const isTrusted = TRUSTED_CHANNEL_IDS.has(channelId);
  const isWhitelisted = WHITELISTED_CHANNELS.includes(channelId);
  const isHighSubCount = subscriberCount >= MIN_SUBSCRIBERS;
  const hasMinViews = viewCount >= MIN_AVG_VIEWS;

  // Trusted and whitelisted channels always pass
  if (isTrusted || isWhitelisted) {
    return { pass: true, reasons: [] };
  }

  if (!isHighSubCount) {
    reasons.push(`Channel has only ${subscriberCount.toLocaleString()} subscribers (min ${MIN_SUBSCRIBERS.toLocaleString()})`);
  }

  if (!hasMinViews) {
    reasons.push(`Video has only ${viewCount.toLocaleString()} views (min ${MIN_AVG_VIEWS.toLocaleString()})`);
  }

  // Check if channel was active recently (within 30 days)
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysSince = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) {
    reasons.push(`Video is ${Math.floor(daysSince)} days old`);
  }

  const pass = isHighSubCount || (hasMinViews && daysSince <= 30);

  return { pass, reasons };
}
