import { useState } from "react";
import { Product } from "@/types/restaurant";
import { groupBySubcategory } from "@/lib/groupBySubcategory";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";

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
 * Renders subcategory filters.
 *
 * - When ANY subcategory in the group has a `subImage`, all are rendered as
 *   small image-tile cards (image on top, name below). Subcategories that
 *   lack their own image still get a tile but show a name-only fallback,
 *   so the layout stays uniform.
 * - When NONE have an image, falls back to the original compact pill row.
 *
 * Renders nothing if the category has no subcategories at all.
 */
export function SubcategoryButtons({ categoryId, products, activeSub, onToggle }: SubcategoryButtonsProps) {
  const subGroups = groupBySubcategory(products).filter((g) => g.subId !== null);
  if (subGroups.length === 0) return null;

  const hasAnyImage = subGroups.some((g) => !!g.subImage);

  if (hasAnyImage) {
    return (
      <div
        className="grid gap-2 mb-4"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        {subGroups.map((group) => {
          const isActive = activeSub === group.subId;
          return (
            <button
              key={group.subId}
              onClick={() => onToggle(group.subId!)}
              title={`${group.subName} (${group.products.length})`}
              className={
                "group relative flex flex-col items-center rounded-xl overflow-hidden border-2 transition-all duration-200 " +
                (isActive
                  ? "border-primary shadow-md ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50")
              }
            >
              {group.subImage ? (
                <img
                  src={getProductImageSrc(group.subImage)}
                  onError={handleProductImageError}
                  alt={group.subName ?? ""}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center text-muted-foreground/60 text-2xl">
                  •
                </div>
              )}
              <span
                className={
                  "w-full px-1.5 py-1 text-[10px] font-medium text-center truncate " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground")
                }
              >
                {group.subName}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Fallback — no images at all in this group: keep the compact pill row.
  return (
    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
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
