/**
 * YouTube Feed Hook — Pipeline-Driven, Deterministic Data Delivery
 *
 * This hook is the bridge between the UI and the content pipeline.
 * It manages:
 *   - Initial data load (pipeline phase 1-6)
 *   - Auto-refresh with stale-while-revalidate (every 10 min)
 *   - Pagination via cached sorted results
 *   - Error recovery with graceful degradation
 *   - Category and sort state management
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Video } from '@/lib/mock-data';
import { runContentPipeline, getPipelineHealth, type FeedSort, type PipelineConfig, type PipelineResult } from '@/lib/content-pipeline';

interface UseYouTubeFeedOptions {
  category?: string;
  sort?: FeedSort;
  perPage?: number;
}

interface UseYouTubeFeedReturn {
  videos: Video[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  pipelineLog: PipelineResult['pipelineLog'];
  source: PipelineResult['source'];
  health: ReturnType<typeof getPipelineHealth>;
}

export function useYouTubeFeed(options: UseYouTubeFeedOptions = {}): UseYouTubeFeedReturn {
  const { category = 'All', sort = 'latest', perPage = 12 } = options;

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pipelineLog, setPipelineLog] = useState<PipelineResult['pipelineLog']>([]);
  const [source, setSource] = useState<PipelineResult['source']>('cache');

  const fetchingRef = useRef(false);
  const allSortedRef = useRef<Video[]>([]); // Full sorted list for pagination

  const fetchVideos = useCallback(async (pageNum: number, isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const config: PipelineConfig = {
        category,
        sort,
        page: pageNum,
        perPage,
        offlineMode: false,
      };

      const result = await runContentPipeline(config);

      if (pageNum === 1) {
        // Store full sorted list for client-side pagination
        allSortedRef.current = result.videos;
        setVideos(result.videos);
      } else {
        // Append new page
        allSortedRef.current = [...allSortedRef.current, ...result.videos];
        setVideos(allSortedRef.current);
      }

      setHasMore(result.hasMore);
      setPipelineLog(result.pipelineLog);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [category, sort, perPage]);

  // Initial load + category/sort changes
  useEffect(() => {
    setPage(1);
    allSortedRef.current = [];
    fetchVideos(1, false);
  }, [category, sort, refreshKey, fetchVideos]);

  // Auto-refresh every 10 minutes (stale-while-revalidate)
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

  const health = getPipelineHealth();

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    pipelineLog,
    source,
    health,
  };
}
