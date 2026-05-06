import type { Video } from './mock-data';
import { classifyVideo } from './category-rules';

const API_KEY = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_YOUTUBE_API_KEY
  ? process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  : '';

export interface YouTubeSearchResult {
  videos: Video[];
  nextPageToken?: string;
}

export interface YouTubeVideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

async function fetchFromYouTube(endpoint: string, params: Record<string, string>): Promise<unknown> {
  if (!API_KEY) {
    throw new Error('No YouTube API key configured');
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.set('key', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  return response.json();
}

function parseDuration(iso: string): string {
  if (!iso) return '0:00';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(num: string | number): number {
  return parseInt(String(num).replace(/[^0-9]/g, '')) || 0;
}

export async function searchSportsVideos(
  query: string = 'sports news today',
  pageToken?: string
): Promise<YouTubeSearchResult> {
  if (!API_KEY) {
    throw new Error('No API key');
  }

  const params: Record<string, string> = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '12',
    order: 'date',
    videoCategoryId: '17', // Sports category
  };

  if (pageToken) {
    params.pageToken = pageToken;
  }

  const data = await fetchFromYouTube('search', params) as Record<string, unknown>;
  const items = (data.items as Record<string, unknown>[]) || [];

  const videoIds = items.map(item => (item.id as Record<string, string>).videoId).filter(Boolean);
  let statsMap: Record<string, YouTubeVideoStats> = {};

  if (videoIds.length > 0) {
    statsMap = await getVideoStatsBatch(videoIds);
  }

  const videos: Video[] = items
    .filter((item) => {
      const id = (item.id as Record<string, string>)?.videoId;
      return id;
    })
    .map((item) => {
      const snippet = item.snippet as Record<string, unknown>;
      const id = (item.id as Record<string, string>).videoId;
      const videoId = id;
      const title = (snippet.title as string) || '';
      const description = (snippet.description as string) || '';
      const channelName = (snippet.channelTitle as string) || '';
      const channelId = (snippet.channelId as string) || '';
      const publishedAt = (snippet.publishedAt as string) || '';
      const thumbnailUrl = ((snippet.thumbnails as Record<string, Record<string, string>>)?.medium?.url)
        || ((snippet.thumbnails as Record<string, Record<string, string>>)?.default?.url)
        || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

      const stats = statsMap[videoId] || { viewCount: 0, likeCount: 0, commentCount: 0 };
      const category = classifyVideo(title, description);

      return {
        videoId,
        title,
        channelName,
        channelId,
        thumbnailUrl,
        publishedAt,
        description,
        ...stats,
        duration: '0:00',
        category,
      } as Video;
    });

  return {
    videos,
    nextPageToken: data.nextPageToken as string | undefined,
  };
}

export async function getVideoStatsBatch(videoIds: string[]): Promise<Record<string, YouTubeVideoStats>> {
  if (!API_KEY || videoIds.length === 0) return {};

  const data = await fetchFromYouTube('videos', {
    part: 'statistics,contentDetails',
    id: videoIds.join(','),
  }) as Record<string, unknown>;

  const items = (data.items as Record<string, unknown>[]) || [];
  const result: Record<string, YouTubeVideoStats> = {};

  for (const item of items) {
    const id = item.id as string;
    const statistics = item.statistics as Record<string, string>;
    result[id] = {
      viewCount: formatNumber(statistics?.viewCount || '0'),
      likeCount: formatNumber(statistics?.likeCount || '0'),
      commentCount: formatNumber(statistics?.commentCount || '0'),
    };
  }

  return result;
}

export async function getVideoDetails(videoId: string): Promise<YouTubeVideoStats & { duration: string }> {
  if (!API_KEY) {
    throw new Error('No API key');
  }

  const data = await fetchFromYouTube('videos', {
    part: 'statistics,contentDetails',
    id: videoId,
  }) as Record<string, unknown>;

  const items = (data.items as Record<string, unknown>[]) || [];
  if (items.length === 0) {
    return { viewCount: 0, likeCount: 0, commentCount: 0, duration: '0:00' };
  }

  const item = items[0];
  const statistics = item.statistics as Record<string, string>;
  const contentDetails = item.contentDetails as Record<string, string>;

  return {
    viewCount: formatNumber(statistics?.viewCount || '0'),
    likeCount: formatNumber(statistics?.likeCount || '0'),
    commentCount: formatNumber(statistics?.commentCount || '0'),
    duration: parseDuration(contentDetails?.duration || ''),
  };
}

export async function getVideosByChannel(
  channelId: string,
  maxResults: number = 6
): Promise<Video[]> {
  if (!API_KEY) {
    throw new Error('No API key');
  }

  const data = await fetchFromYouTube('search', {
    part: 'snippet',
    channelId,
    type: 'video',
    maxResults: String(maxResults),
    order: 'date',
  }) as Record<string, unknown>;

  const items = (data.items as Record<string, unknown>[]) || [];
  const videoIds = items.map(item => (item.id as Record<string, string>)?.videoId).filter(Boolean);

  let statsMap: Record<string, YouTubeVideoStats> = {};
  if (videoIds.length > 0) {
    statsMap = await getVideoStatsBatch(videoIds);
  }

  return items
    .filter((item) => (item.id as Record<string, string>)?.videoId)
    .map((item) => {
      const snippet = item.snippet as Record<string, unknown>;
      const id = (item.id as Record<string, string>).videoId;
      const title = (snippet.title as string) || '';
      const description = (snippet.description as string) || '';
      const channelName = (snippet.channelTitle as string) || '';
      const channelIdStr = (snippet.channelId as string) || '';
      const publishedAt = (snippet.publishedAt as string) || '';
      const thumbnailUrl = ((snippet.thumbnails as Record<string, Record<string, string>>)?.medium?.url)
        || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

      const stats = statsMap[id] || { viewCount: 0, likeCount: 0, commentCount: 0 };
      const category = classifyVideo(title, description);

      return {
        videoId: id,
        title,
        channelName,
        channelId: channelIdStr,
        thumbnailUrl,
        publishedAt,
        description,
        ...stats,
        duration: '0:00',
        category,
      } as Video;
    });
}

export function hasApiKey(): boolean {
  return !!API_KEY;
}
