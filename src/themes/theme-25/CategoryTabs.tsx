import { useRef, useEffect, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Category } from "@/hooks/useRestaurant";
import { cn } from "@/lib/utils";

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
 * Orange-Fresh filter pills — rounded-full, horizontally scrollable.
 * Active: solid orange-500 bg + white text. Inactive: orange-100 bg +
 * orange-500 text. Mirrors the reference design's "Filters" row.
 */
export const CategoryTabs = memo(function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  campaignTab,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeElement = scrollRef.current?.querySelector(
      `[data-category="${activeCategory}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCategory]);

  const handleClick = useCallback(
    (categoryId: string) => {
      onCategoryChange(categoryId);
    },
    [onCategoryChange],
  );

  const renderTab = (
    id: string,
    name: string,
    isActive: boolean,
    leadingEmoji?: string,
  ) => (
    <motion.button
      key={id}
      data-category={id}
      onClick={() => handleClick(id)}
      whileTap={{ scale: 0.94 }}
      className={cn("filter-pill flex-shrink-0", isActive && "is-active")}
    >
      {leadingEmoji && <span className="mr-1 leading-none">{leadingEmoji}</span>}
      {name}
    </motion.button>
  );

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto hide-scrollbar items-center gap-2 px-4 pt-2 pb-3"
    >
      {campaignTab &&
        campaignTab.count > 0 &&
        renderTab(campaignTab.id, campaignTab.name, activeCategory === campaignTab.id, "🔥")}

      {categories.map((category) =>
        renderTab(category.id, category.name, activeCategory === category.id),
      )}
    </div>
  );
});
