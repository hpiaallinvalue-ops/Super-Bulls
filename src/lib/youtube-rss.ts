/**
 * YouTube RSS Feed Fetcher & Parser
 *
 * YouTube provides free RSS feeds for every channel:
 *   https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
 *
 * Each feed returns the ~15 most recent uploads with:
 *   - Title, description, thumbnail
 *   - Published date
 *   - View count (from <media:statistics>)
 *   - Channel info
 *
 * No API key needed. No quota. Completely free.
 */

import type { Video } from './mock-data';

const RSS_BASE_URL = 'https://www.youtube.com/feeds/videos.xml';

// ── Fetch RSS Feed ─────────────────────────────────────────────────────────

export async function fetchRSSFeed(channelId: string): Promise<string> {
  const url = `${RSS_BASE_URL}?channel_id=${channelId}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml, text/xml',
      'User-Agent': 'SuperBulls/1.0',
    },
    signal: AbortSignal.timeout(10_000), // 10s timeout per channel
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for channel ${channelId}: ${response.status}`);
  }

  return response.text();
}

// ── Parse RSS XML → Video[] ───────────────────────────────────────────────

export function parseRSSFeed(
  xml: string,
  channelName: string,
  channelId: string
): Video[] {
  const videos: Video[] = [];

  // Split by <entry> tags — skip everything before the first <entry>
  const parts = xml.split('<entry>');
  if (parts.length < 2) return videos; // No entries found

  for (let i = 1; i < parts.length; i++) {
    const endIdx = parts[i].indexOf('</entry>');
    if (endIdx === -1) continue;
    const block = parts[i].substring(0, endIdx);

    const videoId = extractTag(block, '<yt:videoId>');
    if (!videoId) continue;

    const title = decodeHTMLEntities(
      extractTag(block, '<title>') || extractTag(block, '<media:title>') || 'Untitled'
    );
    const published = extractTag(block, '<published>') || new Date().toISOString();

    // Description may be in <media:description> with CDATA
    const rawDesc = extractTag(block, '<media:description>') || '';
    const description = cleanDescription(rawDesc);

    // Thumbnail — prefer high quality
    const thumbMatch = block.match(/<media:thumbnail\s[^>]*url="([^"]+)"/);
    const thumbnailUrl = thumbMatch?.[1]
      || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // View count from <media:statistics views="...">
    const viewsMatch = block.match(/<media:statistics\s[^>]*views="(\d+)"/);
    const viewCount = viewsMatch ? parseInt(viewsMatch[1], 10) : 0;

    videos.push({
      videoId,
      title,
      channelName,
      channelId,
      thumbnailUrl,
      publishedAt: published,
      description,
      viewCount,
      likeCount: 0,
      commentCount: 0,
      duration: '',
      category: '',
    });
  }

  return videos;
}

// ── XML Parsing Helpers ───────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const startIdx = xml.indexOf(tag);
  if (startIdx === -1) return '';
  const valueStart = startIdx + tag.length;
  const endIdx = xml.indexOf('</', valueStart);
  if (endIdx === -1) return '';
  return xml.substring(valueStart, endIdx).trim();
}

function cleanDescription(raw: string): string {
  // Strip CDATA wrappers
  let cleaned = raw
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim();
  // Strip basic HTML tags but keep text
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Collapse whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
