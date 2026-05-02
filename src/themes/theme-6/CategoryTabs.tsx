import { useRef, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  campaignTab?: {
    id: string;
    name: string;
    count: number;
  } | null;
  isHeaderVisible?: boolean;
}

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab, isHeaderVisible = true }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const activeElement = container?.querySelector(`[data-category="${activeCategory}"]`) as HTMLElement | null;
    if (!container || !activeElement) return;
    const targetLeft = activeElement.offsetLeft - container.clientWidth / 2 + activeElement.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeCategory]);

  const handleClick = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
  }, [onCategoryChange]);

  const allTabs = [
    ...(campaignTab && campaignTab.count > 0 ? [{ id: campaignTab.id, name: campaignTab.name, isCampaign: true }] : []),
    ...categories.map(c => ({ id: c.id, name: c.name, isCampaign: false })),
  ];

  return (
    <div
      className="sticky z-40 bg-card/95 backdrop-blur-sm border-b border-border/30 transition-all duration-300"
      style={{ top: isHeaderVisible ? '49px' : '0px' }}
    >
      <div ref={scrollRef} className="flex overflow-x-auto hide-scrollbar max-w-[600px] mx-auto px-3 py-2 gap-2">
        {allTabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              data-category={tab.id}
              onClick={() => handleClick(tab.id)}
              className={cn(
                'relative flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap uppercase',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="theme6-tab-pill"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                {tab.isCampaign && <Flame className="w-3 h-3" />}
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
