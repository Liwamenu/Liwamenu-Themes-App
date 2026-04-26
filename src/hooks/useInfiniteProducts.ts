import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/restaurant";

interface CategoryLike {
  id: string;
  products: Product[];
  [k: string]: unknown;
}

const PAGE_SIZE = 50;

/**
 * Progressive renderer for theme menu pages. Returns a sliced version of
 * `categories` containing only the first `displayCount` products (in order),
 * plus a sentinel ref to attach to a div at the end of the list. As that
 * sentinel becomes visible, `displayCount` increases by 50 until all
 * products are rendered.
 *
 * Resets back to PAGE_SIZE whenever the dependency `resetKey` changes.
 */
export function useInfiniteProducts<T extends CategoryLike>(
  categories: T[],
  resetKey: string,
) {
  const total = useMemo(
    () => categories.reduce((sum, c) => sum + c.products.length, 0),
    [categories],
  );

  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when filter/category context changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [resetKey]);

  // Clamp if total shrinks below displayCount
  useEffect(() => {
    if (displayCount > total && total > 0) setDisplayCount(Math.max(PAGE_SIZE, total));
  }, [total, displayCount]);

  useEffect(() => {
    if (displayCount >= total) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDisplayCount((c) => Math.min(c + PAGE_SIZE, Math.max(total, c + PAGE_SIZE)));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [displayCount, total]);

  const slicedCategories = useMemo(() => {
    const out: T[] = [];
    let remaining = displayCount;
    for (const cat of categories) {
      if (remaining <= 0) break;
      if (cat.products.length <= remaining) {
        out.push(cat);
        remaining -= cat.products.length;
      } else {
        out.push({ ...cat, products: cat.products.slice(0, remaining) });
        remaining = 0;
      }
    }
    return out;
  }, [categories, displayCount]);

  return {
    slicedCategories,
    sentinelRef,
    hasMore: displayCount < total,
    total,
  };
}
