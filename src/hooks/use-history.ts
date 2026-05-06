'use client';

import { useState, useEffect, useCallback } from 'react';
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
    // Try loading static history
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

  useEffect(() => {
    let cancelled = false;
    loadHistoryFromCache().then(data => {
      if (!cancelled) {
        setHistory(data);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const addToHistory = useCallback(async (video: Video) => {
    try {
      await cache.addToHistory(video);
      setHistory(prev => {
        const filtered = prev.filter(v => v.videoId !== video.videoId);
        return [video, ...filtered].slice(0, 100);
      });
    } catch {
      // Silently fail
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await cache.clear();
      setHistory([]);
    } catch {
      // Silently fail
    }
  }, []);

  return { history, addToHistory, clearHistory };
}
