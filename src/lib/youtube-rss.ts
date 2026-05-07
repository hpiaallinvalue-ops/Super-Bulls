/**
 * YouTube RSS Feed Fetcher & Parser
 *
 * Fetches YouTube channel uploads via the rss2json.com proxy service.
 * This is necessary because YouTube's direct RSS endpoint is blocked
 * or rate-limited from many server environments (including Cloudflare Workers).
 *
 * rss2json.com free tier: 10,000 requests/day, 10 req/s.
 * With 11 channels every 5 min = ~3,168 requests/day. Well within limits.
 *
 * Returns JSON directly — no XML parsing needed.
 */

import type { Video } from './mock-data';

const RSS2JSON_BASE = 'https://api.rss2json.com/v1/api.json';
const RSS_PROXY_URL = 'https://www.youtube.com/feeds/videos.xml';

// ── Fetch RSS Feed via Proxy ───────────────────────────────────────────────

export async function fetchRSSFeed(channelId: string): Promise<string> {
  const rssUrl = `${RSS_PROXY_URL}?channel_id=${channelId}`;
  const apiUrl = `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(rssUrl)}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SuperBulls/1.0',
    },
    signal: AbortSignal.timeout(15_000), // 15s timeout
  });

  if (!response.ok) {
    throw new Error(`RSS proxy failed for channel ${channelId}: ${response.status}`);
  }

  return response.text();
}

// ── Parse JSON Response → Video[] ─────────────────────────────────────────

export function parseRSSFeed(
  json: string,
  channelName: string,
  channelId: string
): Video[] {
  const videos: Video[] = [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json);
  } catch {
    return videos;
  }

  if (data.status !== 'ok' || !Array.isArray(data.items)) {
    return videos;
  }

  for (const item of data.items as Array<Record<string, string>>) {
    const videoId = extractVideoId(item.link || item.guid || '');
    if (!videoId) continue;

    const title = item.title || 'Untitled';
    const published = item.pubDate || new Date().toISOString();
    const description = cleanDescription(item.description || item.content || '');
    const thumbnailUrl = item.thumbnail || item.enclosure?.link || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videos.push({
      videoId,
      title,
      channelName,
      channelId,
      thumbnailUrl,
      publishedAt: published,
      description,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      duration: '',
      category: '',
    });
  }

  return videos;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractVideoId(url: string): string {
  // Match youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function cleanDescription(raw: string): string {
  if (!raw) return '';
  // Strip HTML tags but keep text
  let cleaned = raw.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}
