import { useState } from "react";
import { Product } from "@/types/restaurant";
import { groupBySubcategory } from "@/lib/groupBySubcategory";

/**
 * Tracks which subcategory is active per category (null = "show all").
 * Toggle behavior: clicking the active sub clears it.
 */
export function useSubcategoryFilter() {
  const [active, setActive] = useState<Record<string, string | null>>({});

  const toggle = (categoryId: string, subId: string) =>
    setActive((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId] === subId ? null : subId,
    }));

  const getActive = (categoryId: string) => active[categoryId] ?? null;

  const filter = (categoryId: string, products: Product[]) => {
    const sub = active[categoryId];
    return sub ? products.filter((p) => p.subCategoryId === sub) : products;
  };

  return { toggle, getActive, filter };
}

interface SubcategoryButtonsProps {
  categoryId: string;
  products: Product[];
  activeSub: string | null;
  onToggle: (subId: string) => void;
}

/**
 * Renders subcategory filter buttons in a 4-column grid (wraps to next row).
 * Buttons match category-tab styling but ~40% smaller.
 * Renders nothing if the category has no subcategories.
 */
export function SubcategoryButtons({ categoryId, products, activeSub, onToggle }: SubcategoryButtonsProps) {
  const subGroups = groupBySubcategory(products).filter((g) => g.subId !== null);
  if (subGroups.length === 0) return null;
  return (
    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))" }}>
      {subGroups.map((group) => {
        const isActive = activeSub === group.subId;
        return (
          <button
            key={group.subId}
            onClick={() => onToggle(group.subId!)}
            className={
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 truncate " +
              (isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
            }
            title={`${group.subName} (${group.products.length})`}
          >
            {group.subName}
          </button>
        );
      })}
    </div>
  );
}
