'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, History as HistoryIcon } from 'lucide-react';

export type FeedTab = 'latest' | 'trending' | 'history';

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as FeedTab)}>
      <TabsList className="bg-muted/50">
        <TabsTrigger value="latest" className="gap-1.5 text-sm">
          <Clock className="size-3.5" />
          Latest
        </TabsTrigger>
        <TabsTrigger value="trending" className="gap-1.5 text-sm">
          <TrendingUp className="size-3.5" />
          Trending
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5 text-sm">
          <HistoryIcon className="size-3.5" />
          History
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
