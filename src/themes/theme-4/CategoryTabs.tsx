import { useRef, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';
import { Beef, Drumstick, Salad, Coffee, Cake, UtensilsCrossed, Flame, Soup, Sandwich, Pizza, Wine } from 'lucide-react';

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

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('çorba') || name.includes('soup')) return Soup;
  if (name.includes('burger')) return Beef;
  if (name.includes('tavuk') || name.includes('chicken')) return Drumstick;
  if (name.includes('salata') || name.includes('side') || name.includes('yan')) return Salad;
  if (name.includes('içecek') || name.includes('drink')) return Coffee;
  if (name.includes('tatlı') || name.includes('dessert')) return Cake;
  if (name.includes('pizza')) return Pizza;
  if (name.includes('sandwich') || name.includes('toast') || name.includes('tost')) return Sandwich;
  if (name.includes('şarap') || name.includes('wine') || name.includes('kokteyl') || name.includes('cocktail')) return Wine;
  if (name.includes('menü') || name.includes('menu')) return UtensilsCrossed;
  if (name.includes('izgara') || name.includes('grill') || name.includes('kebap') || name.includes('kebab')) return Beef;
  if (name.includes('ana') || name.includes('main')) return UtensilsCrossed;
  return UtensilsCrossed;
};

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab }: CategoryTabsProps) {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-xl">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto hide-scrollbar"
      >
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-3 transition-all duration-200 relative',
              activeCategory === campaignTab.id
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full">
              {campaignTab.name}
            </span>
            {activeCategory === campaignTab.id && (
              <motion.div layoutId="theme4-tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
            )}
          </motion.button>
        )}
        
        {categories.map((category) => {
          const IconComponent = getCategoryIcon(category.name);
          return (
            <motion.button
              key={category.id}
              data-category={category.id}
              onClick={() => handleClick(category.id)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-3 transition-all duration-200 relative',
                activeCategory === category.id
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full">
                {category.name}
              </span>
              {activeCategory === category.id && (
                <motion.div layoutId="theme4-tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
