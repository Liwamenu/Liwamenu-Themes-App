import { useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Beef, Drumstick, Salad, Coffee, Cake, UtensilsCrossed, Flame, Soup, Sandwich, Pizza, Wine } from 'lucide-react';
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
  /** Hide the bar — useful when a modal is open so its sticky controls aren't covered */
  isHidden?: boolean;
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('çorba') || name.includes('soup')) return Soup;
  if (name.includes('burger')) return Beef;
  if (name.includes('tavuk') || name.includes('chicken')) return Drumstick;
  if (name.includes('salata') || name.includes('side') || name.includes('yan')) return Salad;
  if (name.includes('içecek') || name.includes('drink')) return Coffee;
  if (name.includes('tatlı') || name.includes('dessert') || name.includes('pasta')) return Cake;
  if (name.includes('pizza')) return Pizza;
  if (name.includes('sandwich') || name.includes('toast') || name.includes('tost')) return Sandwich;
  if (name.includes('şarap') || name.includes('wine') || name.includes('kokteyl') || name.includes('cocktail')) return Wine;
  if (name.includes('izgara') || name.includes('grill') || name.includes('kebap') || name.includes('kebab')) return Beef;
  return UtensilsCrossed;
};

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab, isHidden = false }: CategoryTabsProps) {
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

  const handleClick = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
  }, [onCategoryChange]);

  if (isHidden) return null;

  return createPortal(
    <div className="theme-12 fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-xl">
      <div ref={scrollRef} className="flex overflow-x-auto hide-scrollbar">
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-3 transition-colors duration-200 relative',
              activeCategory === campaignTab.id ? 'text-secondary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full">
              {campaignTab.name}
            </span>
            {activeCategory === campaignTab.id && (
              <motion.div layoutId="theme12-tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-secondary rounded-full" />
            )}
          </motion.button>
        )}

        {categories.map((category) => {
          const IconComponent = getCategoryIcon(category.name);
          const isActive = activeCategory === category.id;
          return (
            <motion.button
              key={category.id}
              data-category={category.id}
              onClick={() => handleClick(category.id)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-3 transition-colors duration-200 relative',
                isActive ? 'text-secondary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full">
                {category.name}
              </span>
              {isActive && (
                <motion.div layoutId="theme12-tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-secondary rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>,
    document.body
  );
});
