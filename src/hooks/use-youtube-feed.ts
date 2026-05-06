/**
 * YouTube Feed Hook — RSS-Powered, Zero API Key Required
 *
 * Fetches from /api/feed (server-side RSS aggregation) and handles:
 *   - Category filtering
 *   - Sort by latest / trending (view count)
 *   - Client-side pagination
 *   - Auto-refresh every 10 minutes
 *   - Graceful fallback to mock data on error
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Video } from '@/lib/mock-data';

interface UseYouTubeFeedOptions {
  category?: string;
  sort?: 'latest' | 'trending';
  perPage?: number;
}

interface UseYouTubeFeedReturn {
  videos: Video[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useYouTubeFeed(options: UseYouTubeFeedOptions = {}): UseYouTubeFeedReturn {
  const { category = 'All', sort = 'latest', perPage = 12 } = options;

  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchingRef = useRef(false);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const params = new URLSearchParams({ category });
      const response = await fetch(`/api/feed?${params}`);
      if (!response.ok) throw new Error(`Feed error: ${response.status}`);

      const data = await response.json();
      let videos: Video[] = data.videos || [];

      // Sort client-side
      if (sort === 'trending') {
        videos = [...videos].sort((a, b) => b.viewCount - a.viewCount);
      } else {
        videos = [...videos].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      }

      setAllVideos(videos);
    } catch (err) {
      // Fallback to mock data
      const { getMockVideos } = await import('@/lib/mock-data');
      const mockVids = getMockVideos(category === 'All' ? undefined : category);
      const sorted = sort === 'trending'
        ? [...mockVids].sort((a, b) => b.viewCount - a.viewCount)
        : [...mockVids].sort(
            (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
      setAllVideos(sorted);
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [category, sort]);

  // Initial load + category/sort changes
  useEffect(() => {
    setPage(1);
    fetchFeed();
  }, [category, sort, refreshKey, fetchFeed]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed(true);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Client-side pagination
  const pageVideos = allVideos.slice(0, page * perPage);
  const hasMore = pageVideos.length < allVideos.length;

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setPage(p => p + 1);
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { videos: pageVideos, loading, error, hasMore, loadMore, refresh };
}
