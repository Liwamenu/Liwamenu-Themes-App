import type { OrderTag, OrderTagItem } from "@/types/restaurant";

/**
 * Effective minimum and maximum selection bounds for an OrderTag.
 *
 * SambaPOS convention (the upstream POS this menu syncs from):
 *   - `min=0, max=0` is the DEFAULT and means **"exactly one selection
 *     is allowed"** — identical to `min=1, max=1`. Treating those two
 *     configurations identically avoids unset tags allowing zero
 *     selections or being treated as unlimited multi-select.
 *   - `max=0` WITH an explicit `min > 0` means **"no upper limit"** —
 *     the customer may pick as many as the group has items. Previously
 *     this leaked through as a literal max of 0, so the UI blocked all
 *     selection and showed a "En fazla 0 seçim yapabilirsiniz" toast.
 *     We now resolve such a max to the number of items in the group, so
 *     the selection is effectively unlimited (capped at all items).
 *
 * Returns the effective bounds the UI should enforce. Callers should
 * use these instead of reading `tag.minSelected` / `tag.maxSelected`
 * directly so the SambaPOS conventions are honored uniformly.
 */
export function getEffectiveTagBounds(tag: OrderTag): {
  min: number;
  max: number;
} {
  if (tag.minSelected === 0 && tag.maxSelected === 0) {
    return { min: 1, max: 1 };
  }
  // max=0 → "no maximum" → up to the number of items in the group.
  const itemCount = Array.isArray(tag.orderTagItems) ? tag.orderTagItems.length : 0;
  const max = tag.maxSelected === 0 ? itemCount : tag.maxSelected;
  return { min: tag.minSelected, max };
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
