'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ExternalLink, Eye, ThumbsUp, MessageSquare, ChevronDown, ChevronUp, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard } from '@/components/video-card';
import { CATEGORY_COLORS } from '@/config/categories';
import type { Video } from '@/lib/mock-data';

interface VideoPlayerProps {
  video: Video;
  onBack: () => void;
  onVideoSelect: (video: Video) => void;
  relatedVideos: Video[];
  loadingStats: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type EmbedStatus = 'loading' | 'playing' | 'blocked' | 'error';

function VideoPlayer({
  video,
  onBack,
  onVideoSelect,
  relatedVideos,
  loadingStats,
}: VideoPlayerProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>('loading');
  const [iframeVisible, setIframeVisible] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embedCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoryColor = CATEGORY_COLORS[video.category] || CATEGORY_COLORS.Other;

  // Lazy load iframe using IntersectionObserver
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIframeVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for YouTube embed error messages via postMessage
  useEffect(() => {
    if (!iframeVisible) return;

    const handleMessage = (event: MessageEvent) => {
      // YouTube sends postMessage events when embed fails
      if (event.origin !== 'https://www.youtube.com') return;

      // YouTube embed error detection via postMessage data
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // YouTube sends an event with event === 'error' when embedding fails
        if (data?.event === 'error') {
          setEmbedStatus('blocked');
        }
      } catch {
        // Not JSON, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeVisible]);

  // Fallback: If embed is still 'loading' after 8 seconds, it's likely blocked
  // YouTube blocked embeds show nothing or take a very long time
  useEffect(() => {
    if (!iframeVisible || embedStatus !== 'loading') return;

    embedCheckTimerRef.current = setTimeout(() => {
      // If still loading after 8s, assume blocked and show fallback
      setEmbedStatus('blocked');
    }, 8000);

    return () => {
      if (embedCheckTimerRef.current) clearTimeout(embedCheckTimerRef.current);
    };
  }, [iframeVisible, embedStatus]);

  const handleIframeLoad = useCallback(() => {
    // iframe loaded — clear the timer and mark as playing
    if (embedCheckTimerRef.current) {
      clearTimeout(embedCheckTimerRef.current);
      embedCheckTimerRef.current = null;
    }
    setEmbedStatus('playing');
  }, []);

  const handleIframeError = useCallback(() => {
    setEmbedStatus('error');
  }, []);

  const handleRetryEmbed = useCallback(() => {
    setEmbedStatus('loading');
    // Force reload the iframe by toggling visibility
    setIframeVisible(false);
    setTimeout(() => setIframeVisible(true), 100);
  }, []);

  const showFallback = embedStatus === 'blocked' || embedStatus === 'error';

  return (
    <div className="animate-slide-in-right pb-16">
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
          aria-label="Go back to feed"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm truncate">{video.title}</h1>
          <p className="text-xs text-muted-foreground">{video.channelName}</p>
        </div>
        <Badge className={categoryColor}>{video.category}</Badge>
      </div>

      {/* Video Player */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div
          ref={playerRef}
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
        >
          {iframeVisible && !showFallback ? (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          ) : showFallback ? (
            /* Embed blocked / error fallback */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white relative">
              {/* Background thumbnail with overlay */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-black/50" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                  <AlertTriangle className="size-8 text-red-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {embedStatus === 'blocked' ? 'Video unavailable on embed' : 'Failed to load video'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-sm">
                    {embedStatus === 'blocked'
                      ? 'This video has embedding restrictions from the content owner. Watch it directly on YouTube for the full experience.'
                      : 'An error occurred while loading the video. Try watching on YouTube instead.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    asChild
                    className="bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="size-4 mr-2" />
                      Watch on YouTube
                    </a>
                  </Button>
                  {embedStatus === 'error' && (
                    <Button
                      variant="outline"
                      className="text-white border-gray-600 hover:bg-gray-800"
                      onClick={handleRetryEmbed}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-4 space-y-4">
          <div>
            <h2 className="text-xl font-bold leading-tight">{video.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{video.channelName}</span>
              <span>•</span>
              <span>{formatDate(video.publishedAt)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 py-3 border-y border-border">
            {loadingStats ? (
              <div className="flex gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Eye className="size-4" />
                  <span>{formatNumber(video.viewCount)} views</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ThumbsUp className="size-4" />
                  <span>{formatNumber(video.likeCount)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageSquare className="size-4" />
                  <span>{formatNumber(video.commentCount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className={`text-sm text-muted-foreground leading-relaxed ${!descriptionExpanded ? 'line-clamp-3' : ''}`}>
              {video.description}
            </p>
            {video.description.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="mt-1 text-xs px-0 hover:bg-transparent"
              >
                {descriptionExpanded ? (
                  <>Show less <ChevronUp className="size-3 ml-1" /></>
                ) : (
                  <>Show more <ChevronDown className="size-3 ml-1" /></>
                )}
              </Button>
            )}
          </div>

          {/* Watch on YouTube CTA */}
          <Button asChild className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Watch on YouTube
            </a>
          </Button>

          {/* Related Videos */}
          {relatedVideos.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold text-lg mb-4">Related Videos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedVideos
                  .filter(v => v.videoId !== video.videoId)
                  .slice(0, 6)
                  .map(v => (
                    <VideoCard key={v.videoId} video={v} onClick={onVideoSelect} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
