import type { Video } from './mock-data';

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map(v => (v - min) / (max - min));
}

export function computeRankingScore(video: Video, allVideos: Video[]): number {
  const views = allVideos.map(v => v.viewCount);
  const likes = allVideos.map(v => v.likeCount);
  const comments = allVideos.map(v => v.commentCount);

  const normViews = normalize(views);
  const normLikes = normalize(likes);
  const normComments = normalize(comments);

  const idx = allVideos.findIndex(v => v.videoId === video.videoId);
  if (idx === -1) return 0;

  // Recency: 1 - (hours since publish / 720)
  const now = new Date();
  const published = new Date(video.publishedAt);
  const hoursSince = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
  const recency = Math.max(0, Math.min(1, 1 - hoursSince / 720));

  const score =
    normViews[idx] * 0.4 +
    normLikes[idx] * 0.2 +
    normComments[idx] * 0.1 +
    recency * 0.3;

  return score;
}

export function rankVideos(videos: Video[]): Video[] {
  return [...videos].sort((a, b) => computeRankingScore(b, videos) - computeRankingScore(a, videos));
}

export function sortByLatest(videos: Video[]): Video[] {
  return [...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
