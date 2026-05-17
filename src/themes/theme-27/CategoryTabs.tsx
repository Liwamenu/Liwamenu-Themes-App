import { useRef, useEffect, memo, useCallback } from "react";
import { Category } from "@/hooks/useRestaurant";

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
 * Kiosk pill-style category tabs — horizontal scroll, gold active state.
 * Uses the .kiosk-category-tab CSS classes from theme.css.
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
    const el = scrollRef.current?.querySelector(`[data-category="${activeCategory}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategory]);

  const handleClick = useCallback(
    (categoryId: string) => onCategoryChange(categoryId),
    [onCategoryChange],
  );

  return (
    <div ref={scrollRef} className="kiosk-category-tabs">
      {campaignTab && campaignTab.count > 0 && (
        <button
          data-category={campaignTab.id}
          onClick={() => handleClick(campaignTab.id)}
          className={`kiosk-category-tab ${activeCategory === campaignTab.id ? "active" : ""}`}
        >
          {campaignTab.name}
        </button>
      )}

      {categories.map((category) => (
        <button
          key={category.id}
          data-category={category.id}
          onClick={() => handleClick(category.id)}
          className={`kiosk-category-tab ${activeCategory === category.id ? "active" : ""}`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
});
