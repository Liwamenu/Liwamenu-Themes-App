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

// Throttle helper function
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
      setIsSticky(window.scrollY > 280);
    }, 100); // Throttle to max 10 calls per second

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Scroll active tab into view
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
        isSticky ? 'glass shadow-md' : 'bg-background'
      )}
    >
      <div
        ref={scrollRef}
        className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-3"
      >
        {/* Campaign Tab - appears first if there are campaign products */}
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeCategory === campaignTab.id
                ? 'bg-orange-500 text-white shadow-glow'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300'
            )}
          >
            🔥 {campaignTab.name}
            <span className="ml-1.5 text-xs opacity-70">
              ({campaignTab.count})
            </span>
          </motion.button>
        )}
        
        {categories.map((category) => (
          <motion.button
            key={category.id}
            data-category={category.id}
            onClick={() => handleClick(category.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {category.name}
            <span className="ml-1.5 text-xs opacity-70">
              ({category.products.length})
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
});
