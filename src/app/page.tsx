'use client';

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sun, Moon, Zap, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard } from '@/components/video-card';
import VideoPlayer from '@/components/video-player';
import CategoryFilter from '@/components/category-filter';
import FooterAdBar from '@/components/footer-ad-bar';
import FeedTabs, { type FeedTab } from '@/components/feed-tabs';
import { useYouTubeFeed } from '@/hooks/use-youtube-feed';
import { useHistory } from '@/hooks/use-history';
import { useAuth } from '@/contexts/auth-context';
import { SignInDialog } from '@/components/auth/sign-in-dialog';
import { UserMenu } from '@/components/auth/user-menu';
import { ApiKeysDialog } from '@/components/api-keys-dialog';
import type { Video } from '@/lib/mock-data';

// Skeleton card for loading state
function VideoCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <Skeleton className="w-full aspect-video" />
      <div className="p-3 space-y-2">
        <div className="flex gap-2.5">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="pl-[2.875rem] flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

function VideoGrid({ videos, onVideoClick }: { videos: Video[]; onVideoClick: (v: Video) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map(video => (
        <VideoCard key={video.videoId} video={video} onClick={onVideoClick} />
      ))}
    </div>
  );
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'feed' | 'detail'>('feed');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('latest');
  const [activeCategory, setActiveCategory] = useState('All');
  const [statsLoading, setStatsLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { history, addToHistory } = useHistory();
  const [signInOpen, setSignInOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  // Hydration-safe mounted check using useSyncExternalStore
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useYouTubeFeed({
    category: activeCategory,
    sort: activeTab === 'trending' ? 'trending' : 'latest',
  });

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Simulate stats loading when viewing a video - set state in timeout only
  useEffect(() => {
    if (currentView === 'detail') {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const raf = requestAnimationFrame(() => setStatsLoading(true));
      const timer = setTimeout(() => setStatsLoading(false), 800);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [currentView, selectedVideo?.videoId]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || !hasMore || loading || activeTab === 'history') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, activeTab]);

  const handleVideoClick = useCallback((video: Video) => {
    setSelectedVideo(video);
    setCurrentView('detail');
    addToHistory(video);
  }, [addToHistory]);

  const handleBack = useCallback(() => {
    setCurrentView('feed');
    setSelectedVideo(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Display videos based on tab
  const displayVideos = activeTab === 'history' ? history : videos;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnimatePresence mode="wait">
        {currentView === 'feed' ? (
          <motion.main
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 pb-16"
          >
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
              <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="size-6 text-red-600" />
                  <h1 className="font-[family-name:var(--font-oswald)] text-xl font-bold tracking-tight uppercase">
                    Super <span className="text-red-600">Bulls</span>
                  </h1>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    className="size-9"
                    aria-label="Refresh feed"
                    disabled={loading}
                  >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  {mounted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="size-9"
                      aria-label="Toggle theme"
                    >
                      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </Button>
                  )}
                  {user ? (
                    <UserMenu onOpenApiKeys={() => setApiKeysOpen(true)} />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-sm"
                      onClick={() => setSignInOpen(true)}
                    >
                      <LogIn className="size-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  )}
                </div>
              </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
              {/* Tabs */}
              <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Category filter (hide for history) */}
              {activeTab !== 'history' && (
                <CategoryFilter
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="size-5 shrink-0" />
                  <p className="text-sm">{error}. Showing cached content.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="ml-auto shrink-0"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && displayVideos.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <VideoCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && displayVideos.length === 0 && activeTab === 'history' && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Zap className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">No watch history</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Start watching videos and they&apos;ll appear here for easy access.
                  </p>
                </div>
              )}

              {/* Video grid */}
              {displayVideos.length > 0 && (
                <VideoGrid videos={displayVideos} onVideoClick={handleVideoClick} />
              )}

              {/* Load more trigger */}
              {hasMore && activeTab !== 'history' && (
                <div ref={observerRef} className="flex justify-center py-8">
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="size-4 animate-spin" />
                      Loading more...
                    </div>
                  )}
                </div>
              )}

              {/* End of results */}
              {!hasMore && displayVideos.length > 0 && activeTab !== 'history' && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  You&apos;ve seen all the latest videos. Check back soon!
                </p>
              )}
            </div>
          </motion.main>
        ) : selectedVideo ? (
          <VideoPlayer
            key={selectedVideo.videoId}
            video={selectedVideo}
            onBack={handleBack}
            onVideoSelect={handleVideoClick}
            relatedVideos={videos}
            loadingStats={statsLoading}
          />
        ) : null}
      </AnimatePresence>

      {/* Footer ad bar */}
      <FooterAdBar />

      {/* Auth dialogs */}
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      <ApiKeysDialog open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
    </div>
  );
}
