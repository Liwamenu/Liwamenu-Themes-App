import { useRef, useEffect, useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { Category } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  campaignTab?: {
    id: string;
    name: string;
    count: number;
  } | null;
}

function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      setIsSticky(window.scrollY > 300);
    }, 100);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const activeElement = scrollRef.current?.querySelector(`[data-category="${activeCategory}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  const handleClick = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
  }, [onCategoryChange]);

  return (
    <div
      className={cn(
        'sticky top-0 z-40 transition-all duration-300 border-b-2 border-primary',
        isSticky ? 'glass shadow-md' : 'bg-gray-100 dark:bg-background'
      )}
    >
      <div ref={scrollRef} className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-3">
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap uppercase tracking-wide',
              activeCategory === campaignTab.id
                ? 'bg-campaign text-campaign-foreground shadow-md'
                : 'bg-card text-foreground border border-border hover:border-campaign/40'
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{campaignTab.name}</span>
          </motion.button>
        )}

        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <motion.button
              key={category.id}
              data-category={category.id}
              onClick={() => handleClick(category.id)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap uppercase tracking-wide',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-transparent text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground'
              )}
            >
              {category.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
