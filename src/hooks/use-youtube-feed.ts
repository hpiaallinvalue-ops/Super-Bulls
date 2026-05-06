'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Video } from '@/lib/mock-data';
import { getMockVideos } from '@/lib/mock-data';
import { cache } from '@/lib/cache';
import { hasApiKey, searchSportsVideos } from '@/lib/youtube-api';
import { rankVideos, sortByLatest } from '@/lib/ranking';

interface UseYouTubeFeedOptions {
  category?: string;
  sort?: 'latest' | 'trending';
}

interface UseYouTubeFeedReturn {
  videos: Video[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const SEARCH_QUERIES: Record<string, string[]> = {
  general: ['sports news today', 'latest sports highlights 2025'],
  Football: ['football highlights', 'soccer news today'],
  Basketball: ['NBA highlights', 'basketball news'],
  Cricket: ['cricket highlights', 'cricket news today'],
  MMA: ['UFC highlights', 'MMA news'],
  Tennis: ['tennis highlights', 'ATP tour news'],
  Baseball: ['MLB highlights', 'baseball news'],
  Other: ['sports highlights', 'sports news today'],
};

function getCategoryQuery(category: string): string[] {
  return SEARCH_QUERIES[category] || SEARCH_QUERIES.general;
}

function buildCacheKey(category: string, page: number, sort: string): string {
  return `youtube_${category || 'all'}_p${page}_${sort}`;
}

export function useYouTubeFeed(options: UseYouTubeFeedOptions = {}): UseYouTubeFeedReturn {
  const { category = 'All', sort = 'latest' } = options;
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchingRef = useRef(false);
  const nextTokenRef = useRef<string | undefined>(undefined);

  const fetchVideos = useCallback(async (pageNum: number, isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      // Try cache first
      const cacheKey = buildCacheKey(category, pageNum, sort);
      const cached = await cache.get<Video[]>(cacheKey);

      if (cached && cached.length > 0 && isRefresh) {
        // Stale-while-revalidate: show cached data, then fetch fresh
        setVideos(prev => (pageNum === 1 ? cached : prev));
      }

      if (hasApiKey()) {
        // Try real API
        try {
          const queries = getCategoryQuery(category);
          const query = queries[Math.floor(Math.random() * queries.length)];
          const result = await searchSportsVideos(
            query,
            pageNum > 1 ? nextTokenRef.current : undefined
          );

          const newVideos = result.videos;

          if (newVideos.length > 0) {
            // Cache the results
            await cache.set(cacheKey, newVideos);

            setVideos(prev => {
              if (pageNum === 1) return newVideos;
              const existingIds = new Set(prev.map(v => v.videoId));
              const unique = newVideos.filter(v => !existingIds.has(v.videoId));
              return [...prev, ...unique];
            });

            setHasMore(!!result.nextPageToken);
            nextTokenRef.current = result.nextPageToken;
          } else {
            setHasMore(false);
          }
        } catch {
          // API failed, fall back to mock data
          const mockVids = getMockVideos(category === 'All' ? undefined : category);
          const sorted = sort === 'trending' ? rankVideos(mockVids) : sortByLatest(mockVids);
          const paginated = sorted.slice(0, pageNum * 12);

          setVideos(paginated);
          setHasMore(paginated.length < sorted.length);
          await cache.set(cacheKey, paginated);
        }
      } else {
        // Use mock data
        await new Promise(r => setTimeout(r, 600)); // Simulate loading
        const mockVids = getMockVideos(category === 'All' ? undefined : category);
        const sorted = sort === 'trending' ? rankVideos(mockVids) : sortByLatest(mockVids);
        const paginated = sorted.slice(0, pageNum * 12);

        setVideos(paginated);
        setHasMore(paginated.length < sorted.length);
        await cache.set(cacheKey, paginated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [category, sort]);

  // Initial load
  useEffect(() => {
    setPage(1);
    nextTokenRef.current = undefined;
    fetchVideos(1, false);
  }, [category, sort, refreshKey, fetchVideos]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVideos(1, true);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage);
  }, [loading, hasMore, page, fetchVideos]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { videos, loading, error, hasMore, loadMore, refresh };
}
