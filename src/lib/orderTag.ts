import type { OrderTag, OrderTagItem } from "@/types/restaurant";

/**
 * Effective minimum and maximum selection bounds for an OrderTag.
 *
 * SambaPOS convention (the upstream POS this menu syncs from):
 *   `min=0, max=0` is the default and means **"exactly one selection is
 *   allowed"** — identical to `min=1, max=1`. Treating those two
 *   configurations identically in the UI avoids the awkward fallback
 *   where unset tags ended up allowing zero selections or were treated
 *   as unlimited multi-select.
 *
 * Returns the effective bounds the UI should enforce. Callers should
 * use these instead of reading `tag.minSelected` / `tag.maxSelected`
 * directly so the SambaPOS default is honored uniformly.
 */
export function getEffectiveTagBounds(tag: OrderTag): {
  min: number;
  max: number;
} {
  if (tag.minSelected === 0 && tag.maxSelected === 0) {
    return { min: 1, max: 1 };
  }
  return { min: tag.minSelected, max: tag.maxSelected };
}

/**
 * Whether the OrderTagItem's price should be displayed inline.
 *
 * Show the price when it is meaningfully non-zero (positive surcharge
 * OR negative discount). Skip it when the value is exactly 0 or
 * null/undefined — printing "+₺ 0" was confusing because the price
 * column visually implied a charge that didn't exist.
 */
export function shouldShowTagItemPrice(item: OrderTagItem): boolean {
  return typeof item.price === "number" && item.price !== 0;
}
