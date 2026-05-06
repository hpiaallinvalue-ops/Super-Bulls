'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Video } from '@/lib/mock-data';
import { cache } from '@/lib/cache';
import { useAuth } from '@/contexts/auth-context';
import {
  saveWatchHistory,
  getWatchHistory,
  clearWatchHistory as clearFirestoreHistory,
} from '@/lib/firestore-history';

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

function firestoreEntryToVideo(entry: Record<string, unknown>): Video {
  return {
    videoId: entry.videoId as string,
    title: entry.title as string,
    channelName: entry.channelName as string,
    channelId: '',
    thumbnailUrl: entry.thumbnailUrl as string,
    publishedAt: entry.publishedAt as string,
    description: '',
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    duration: '',
    category: '',
  };
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<Video[]>([]);
  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Load history on mount and when user changes
  useEffect(() => {
    let cancelled = false;
    const userId = user?.uid ?? null;

    // Skip if same user and already loaded
    if (userId === prevUserIdRef.current && initialLoadDoneRef.current) return;
    prevUserIdRef.current = userId;

    async function load() {
      if (userId) {
        // Authenticated: load from Firestore
        try {
          const entries = await getWatchHistory(userId);
          if (!cancelled) {
            const videos = entries.map(firestoreEntryToVideo);
            setHistory(videos);
            // Also update local cache so history tab works while offline
            // Only seed local cache if it's empty (first sign-in)
            const localHistory = await cache.getHistory();
            if (!localHistory || localHistory.length === 0) {
              for (const v of videos) {
                await cache.addToHistory(v);
              }
            }
          }
        } catch {
          // Fallback to local cache if Firestore fails
          const localHistory = await loadHistoryFromCache();
          if (!cancelled) setHistory(localHistory);
        }
      } else {
        // Not authenticated: load from local cache
        const localHistory = await loadHistoryFromCache();
        if (!cancelled) setHistory(localHistory);
      }
      if (!cancelled) initialLoadDoneRef.current = true;
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  const addToHistory = useCallback(async (video: Video) => {
    try {
      // Always save to local cache for offline access
      await cache.addToHistory(video);

      // If authenticated, also save to Firestore
      if (user) {
        await saveWatchHistory(user.uid, {
          videoId: video.videoId,
          title: video.title,
          channelName: video.channelName,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
        });
      }

      setHistory(prev => {
        const filtered = prev.filter(v => v.videoId !== video.videoId);
        return [video, ...filtered].slice(0, 100);
      });
    } catch {
      // Silently fail - still update local state
      setHistory(prev => {
        const filtered = prev.filter(v => v.videoId !== video.videoId);
        return [video, ...filtered].slice(0, 100);
      });
    }
  }, [user]);

  const clearHistory = useCallback(async () => {
    try {
      await cache.clear();
      if (user) {
        await clearFirestoreHistory(user.uid);
      }
      setHistory([]);
    } catch {
      // Silently fail
    }
  }, [user]);

  return { history, addToHistory, clearHistory };
}
