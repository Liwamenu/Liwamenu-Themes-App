import { useRef, useEffect, memo, useCallback } from 'react';
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

/**
 * Sushi-style category navigation. Brush-stroke red strip with cursive
 * Waterfall labels. Active category gets a solid white pill background +
 * dropped script color so it pops out clearly against the red strip.
 */
export const CategoryTabs = memo(function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  campaignTab,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const activeElement = scrollRef.current?.querySelector(`[data-category="${activeCategory}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  const handleClick = useCallback(
    (categoryId: string) => {
      onCategoryChange(categoryId);
    },
    [onCategoryChange],
  );

  const renderTab = (id: string, name: string, isActive: boolean, leadingEmoji?: string) => (
    <motion.button
      key={id}
      data-category={id}
      onClick={() => handleClick(id)}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full font-script text-2xl whitespace-nowrap transition-all',
        isActive
          ? 'bg-white text-[hsl(var(--sushi-red))] shadow-md scale-105'
          : 'text-white/85 hover:text-white hover:bg-white/15',
      )}
    >
      {leadingEmoji && <span className="text-lg leading-none">{leadingEmoji}</span>}
      <span>{name}</span>
    </motion.button>
  );

  return (
    <div className="px-3 pt-1 pb-3">
      <div className="brush-strip relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar items-center gap-2 px-6 py-3"
        >
          {campaignTab &&
            campaignTab.count > 0 &&
            renderTab(campaignTab.id, campaignTab.name, activeCategory === campaignTab.id, '🔥')}

          {categories.map((category) =>
            renderTab(category.id, category.name, activeCategory === category.id),
          )}
        </div>
      </div>
    </div>
  );
});
