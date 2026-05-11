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
      whileTap={{ scale: 0.96 }}
      className={cn(
        "relative flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-[5px] text-sm whitespace-nowrap transition-colors shadow-sm border",
        isActive
          ? // Active: deep walnut fill with parchment text — reads
            // like a wax-stamped chapter header on the parchment
            // canvas. The `(--brand-indigo)` palette from theme-24
            // doesn't exist in theme-26 (undefined HSL would render
            // transparent), which is why the previous styling made
            // active vs. inactive indistinguishable.
            "font-bold bg-[hsl(var(--walnut))] text-[hsl(var(--parchment))] border-[hsl(var(--walnut))] shadow-md"
          : // Inactive: deeper parchment surface + walnut-mid text
            // for clear contrast against the canvas behind. Hovering
            // darkens the text to walnut, hinting at affordance.
            "bg-[hsl(var(--parchment-soft))] text-[hsl(var(--walnut-mid))] font-semibold border-[hsl(var(--taupe)/0.6)] hover:text-[hsl(var(--walnut))]",
      )}
    >
      {leadingEmoji && <span className="text-base leading-none">{leadingEmoji}</span>}
      <span>{name}</span>
      {isActive && (
        <span
          className="absolute left-[15%] right-[15%] -bottom-1 h-1 rounded-full bg-[hsl(var(--amber))]"
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
