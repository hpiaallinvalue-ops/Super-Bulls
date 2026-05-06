'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS } from '@/config/categories';
import type { Video } from '@/lib/mock-data';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatViewCount(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

function VideoCardInner({ video, onClick }: VideoCardProps) {
  const categoryColor = CATEGORY_COLORS[video.category] || CATEGORY_COLORS.Other;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card
        className="overflow-hidden cursor-pointer border border-border/50 bg-card hover:shadow-lg transition-shadow duration-200 gap-0 py-0"
        onClick={() => onClick(video)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(video); }}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-video overflow-hidden bg-muted">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {video.duration && video.duration !== '0:00' && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
              {video.duration}
            </div>
          )}
          <Badge
            className="absolute top-2 left-2 text-[10px] px-1.5 py-0 border-0"
            style={{ backgroundColor: 'transparent' }}
          >
            <span className={categoryColor}>{video.category}</span>
          </Badge>
        </div>

        {/* Content */}
        <div className="p-3 space-y-1.5">
          {/* Channel avatar + title */}
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
              {video.channelName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {video.channelName}
              </p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-[2.875rem]">
            <span>{formatViewCount(video.viewCount)}</span>
            <span>•</span>
            <span>{formatRelativeTime(video.publishedAt)}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export const VideoCard = memo(VideoCardInner);
