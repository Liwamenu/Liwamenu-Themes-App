import { useRef, useEffect, useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';
import { Beef, Drumstick, Salad, Coffee, IceCream, UtensilsCrossed, Flame } from 'lucide-react';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  campaignTab?: {
    id: string;
    name: string;
    count: number;
  } | null;
  externalPageTab?: {
    id: string;
    name: string;
  } | null;
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('burger')) return Beef;
  if (name.includes('tavuk') || name.includes('chicken')) return Drumstick;
  if (name.includes('yan') || name.includes('side')) return Salad;
  if (name.includes('içecek') || name.includes('drink')) return Coffee;
  if (name.includes('tatlı') || name.includes('dessert')) return IceCream;
  if (name.includes('menü') || name.includes('menu')) return UtensilsCrossed;
  return UtensilsCrossed;
};

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

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab, externalPageTab }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="bg-background">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-3"
      >
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border-2',
              activeCategory === campaignTab.id
                ? 'bg-secondary text-secondary-foreground border-secondary shadow-lg'
                : 'bg-card text-foreground border-border hover:border-secondary/50'
            )}
          >
            <Flame className="w-4 h-4" />
            <span>{campaignTab.name}</span>
            <span className="text-xs opacity-70">({campaignTab.count})</span>
          </motion.button>
        )}
        
        {categories.map((category) => {
          const IconComponent = getCategoryIcon(category.name);
          return (
            <motion.button
              key={category.id}
              data-category={category.id}
              onClick={() => handleClick(category.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border-2',
                activeCategory === category.id
                  ? 'bg-secondary text-secondary-foreground border-secondary shadow-lg'
                  : 'bg-card text-foreground border-border hover:border-secondary/50'
              )}
            >
              <IconComponent className="w-4 h-4" />
              <span>{category.name}</span>
              <span className="text-xs opacity-70">({category.products.length})</span>
            </motion.button>
          );
        })}

        {externalPageTab && (
          <motion.button
            key={externalPageTab.id}
            data-category={externalPageTab.id}
            onClick={() => handleClick(externalPageTab.id)}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border-2 bg-card text-foreground border-border hover:border-secondary/50"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{externalPageTab.name}</span>
          </motion.button>
        )}
      </div>
    </div>
  );
});
