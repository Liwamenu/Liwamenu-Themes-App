import { useRef, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';
import { Beef, Drumstick, Salad, Coffee, UtensilsCrossed, Flame, Soup, Sandwich, Pizza, Wine, Cake } from 'lucide-react';

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

export const CategoryTabs = memo(function CategoryTabs({ categories, activeCategory, onCategoryChange, campaignTab, isHeaderVisible = true }: CategoryTabsProps) {
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
    <div
      className="sticky z-40 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm transition-all duration-300"
      style={{ top: isHeaderVisible ? '52px' : '0px' }}
    >
      <div
        ref={scrollRef}
        className="flex overflow-x-auto hide-scrollbar max-w-[1220px] mx-auto"
      >
        {campaignTab && campaignTab.count > 0 && (
          <motion.button
            key={campaignTab.id}
            data-category={campaignTab.id}
            onClick={() => handleClick(campaignTab.id)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-4 transition-all duration-200 border-b-2',
              activeCategory === campaignTab.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-full font-barlow">
              {campaignTab.name}
            </span>
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
                'flex-shrink-0 min-w-[80px] flex flex-col items-center gap-1 py-3 px-4 transition-all duration-200 border-b-2',
                activeCategory === category.id
                  ? 'text-primary border-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-full font-barlow">
                {category.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
