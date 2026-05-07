'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Video } from '@/lib/mock-data';
import { cache } from '@/lib/cache';

interface UseHistoryReturn {
  history: Video[];
  addToHistory: (video: Video) => void;
  clearHistory: () => void;
}

async function loadHistoryFromCache(): Promise<Video[]> {
  try {
    const cachedHistory = await cache.getHistory();
    if (cachedHistory && cachedHistory.length > 0) {
      return cachedHistory as Video[];
    }
    // Try loading static history seed
    const response = await fetch('/data/history.json');
    const staticHistory = await response.json();
    // Seed the cache with static history
    for (const video of staticHistory) {
      await cache.addToHistory(video);
    }
    return staticHistory;
  } catch {
    return [];
  }
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<Video[]>([]);
  const initialLoadDoneRef = useRef(false);

  // Load history on mount (from local cache only — no server-side dependencies)
  useEffect(() => {
    let cancelled = false;

    if (initialLoadDoneRef.current) return;

    loadHistoryFromCache().then((localHistory) => {
      if (!cancelled) {
        setHistory(localHistory);
        initialLoadDoneRef.current = true;
      }
    });

    return () => { cancelled = true; };
  }, []);

  const addToHistory = useCallback(async (video: Video) => {
    try {
      await cache.addToHistory(video);
    } catch {
      // Silently fail — still update local state
    }
    setHistory(prev => {
      const filtered = prev.filter(v => v.videoId !== video.videoId);
      return [video, ...filtered].slice(0, 100);
    });
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await cache.clear();
    } catch {
      // Silently fail
    }
    setHistory([]);
  }, []);

  return { history, addToHistory, clearHistory };
}
