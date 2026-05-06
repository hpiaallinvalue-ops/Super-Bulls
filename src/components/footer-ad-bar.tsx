'use client';

import { Badge } from '@/components/ui/badge';

export default function FooterAdBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-muted/80 backdrop-blur-sm border-t border-border">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
          AD
        </Badge>
        <p className="text-xs text-muted-foreground truncate">
          Advertisement &nbsp;|&nbsp; Sports Betting Partner &nbsp;|&nbsp; Gamble Responsibly
        </p>
      </div>
    </div>
  );
}
