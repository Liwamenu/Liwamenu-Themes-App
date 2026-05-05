import { useRef, useEffect, useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
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

/* Reusable heart-shape SVG icon */
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 160 145" className="w-9 h-8 transition-all" preserveAspectRatio="xMidYMid meet">
    <path
      d="M80 145c-2.3 0-4.6-.9-6.3-2.6C54.1 123.6 0 81.3 0 45 0 20.2 20.2 0 45 0c14.2 0 27.5 6.6 35 17.9C87.5 6.6 100.8 0 115 0c24.8 0 45 20.2 45 45 0 36.3-54.1 78.6-73.7 97.4-1.7 1.7-4 2.6-6.3 2.6z"
      fill={filled ? "currentColor" : "transparent"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 8}
    />
  </svg>
);

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
        'sticky top-0 z-40 transition-all duration-300',
        isSticky ? 'glass shadow-md' : 'bg-card'
      )}
    >
      <div ref={scrollRef} className="flex overflow-x-auto hide-scrollbar gap-3 px-4 py-3">
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.92 }}
            className={cn(
              'flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 transition-colors duration-200 min-w-[68px]',
              activeCategory === campaignTab.id ? 'text-campaign' : 'text-muted-foreground hover:text-campaign/80'
            )}
          >
            <HeartIcon filled={activeCategory === campaignTab.id} />
            <span className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-full">
              {campaignTab.name}
            </span>
          </motion.button>
        )}

        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <motion.button
              key={category.id}
              data-category={category.id}
              onClick={() => handleClick(category.id)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 transition-colors duration-200 min-w-[68px]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/80'
              )}
            >
              <HeartIcon filled={isActive} />
              <span className="text-[10px] font-semibold uppercase tracking-wide truncate max-w-full">
                {category.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
