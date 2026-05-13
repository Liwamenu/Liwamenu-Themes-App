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
 * Clean category strip — Inter, horizontal scroll, active item gets a
 * thick green underline on top of bold ink text (no fills, no emojis).
 * Matches the reference design's "Salads / Wraps" pill row aesthetic.
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
      whileTap={{ scale: 0.96 }}
      className={cn(
        "relative flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-[5px] text-sm whitespace-nowrap transition-colors shadow-sm border",
        isActive
          ? "font-bold bg-[hsl(var(--brand-indigo)/0.6)] text-white border-[hsl(var(--brand-indigo))]"
          : "bg-card text-muted-foreground font-medium border-border hover:text-foreground",
      )}
    >
      {leadingEmoji && <span className="text-base leading-none">{leadingEmoji}</span>}
      <span>{name}</span>
      {isActive && (
        <span
          className="absolute left-[15%] right-[15%] -bottom-1 h-1 rounded-full bg-[hsl(var(--brand-indigo))]"
          aria-hidden="true"
        />
      )}
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
