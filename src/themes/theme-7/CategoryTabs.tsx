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

/* Asymmetric leaf-like corners — large at top-left + bottom-right, tight on the
 * other two. Matches the organic vibe of the product image blob. */
const LEAF_RADIUS = "1.5rem 0.5rem 1.5rem 0.5rem";

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
        isSticky ? 'glass shadow-card' : 'bg-background'
      )}
    >
      <div ref={scrollRef} className="flex overflow-x-auto hide-scrollbar gap-3 px-4 py-3">
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.96 }}
            style={{ borderRadius: LEAF_RADIUS }}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-6 py-1.5 text-[15px] font-bold transition-colors duration-200 whitespace-nowrap',
              activeCategory === campaignTab.id
                ? 'bg-campaign text-campaign-foreground shadow-card'
                : 'bg-card text-foreground'
            )}
          >
            <Flame className="w-4 h-4" />
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
              style={{ borderRadius: LEAF_RADIUS }}
              className={cn(
                'flex-shrink-0 px-6 py-1.5 text-[15px] font-bold transition-colors duration-200 whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'bg-card text-primary/80'
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
