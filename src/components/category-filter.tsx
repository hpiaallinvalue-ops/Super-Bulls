'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ALL_CATEGORIES } from '@/config/categories';

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-1">
      <div className="flex gap-2 min-w-max px-1">
        {ALL_CATEGORIES.map(category => (
          <Button
            key={category}
            variant={activeCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className={cn(
              'rounded-full text-xs font-medium px-3 h-8 shrink-0 transition-all',
              activeCategory === category
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                : 'hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400'
            )}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}
