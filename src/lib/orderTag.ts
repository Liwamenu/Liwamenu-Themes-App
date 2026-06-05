import type { OrderTag, OrderTagItem } from "@/types/restaurant";

/**
 * Effective minimum and maximum selection bounds for an OrderTag.
 *
 * The admin panel exposes `minSelected` / `maxSelected` directly, and they
 * are honored literally:
 *   - `min` = how many selections are REQUIRED. `min=0` means the group is
 *     **optional** — the customer may skip it entirely. A required group has
 *     `min >= 1`.
 *   - `max` = how many selections are ALLOWED. `max=0` means **"no upper
 *     limit"** — the customer may pick as many as the group has items. (A
 *     literal max of 0 would otherwise block all selection and show a
 *     "En fazla 0 seçim yapabilirsiniz" toast.) We resolve `max=0` to the
 *     number of items in the group, so selection is effectively unlimited.
 *
 * So `min=0, max=0` (the admin default for a non-required group) means
 * **"optional, pick up to as many items as the group has"** — NOT a forced
 * single selection. A single-required choice is `min=1, max=1`.
 *
 * Returns the effective bounds the UI should enforce. Callers should use
 * these instead of reading `tag.minSelected` / `tag.maxSelected` directly so
 * the conventions are honored uniformly across every theme.
 */
export function getEffectiveTagBounds(tag: OrderTag): {
  min: number;
  max: number;
} {
  const itemCount = Array.isArray(tag.orderTagItems) ? tag.orderTagItems.length : 0;
  // max=0 → "no maximum" → up to the number of items in the group.
  const max = tag.maxSelected === 0 ? itemCount : tag.maxSelected;
  // min is honored literally; 0 means the group is optional.
  const min = tag.minSelected ?? 0;
  return { min, max };
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
