import { useRestaurantStore } from "@/hooks/useRestaurant";
import type { Menu, Portion } from "@/types/restaurant";

/**
 * Menu-based price list ("Happy Hour" pricing).
 *
 * Each menu carries a `priceListType` telling the theme which price
 * column to treat as the BASE price for non-campaign products while
 * that menu's plan window is active:
 *
 *   - "normal"   → portion.price
 *   - "campaign" → portion.campaignPrice  (falls back to price if 0/missing)
 *   - "special"  → portion.specialPrice   (falls back to price if 0/missing)
 *
 * Campaign-flagged products are unaffected — they keep their existing
 * strikethrough-normal + campaign-price display. priceListType only
 * decides the base price for everything else.
 *
 * This module is intentionally framework-agnostic apart from a single
 * imperative read of the Zustand store (mirrors `getCartItemDisplayPrice`
 * in useCart.ts), so the per-card `getPriceDisplay` math and the cart
 * total math can resolve the active price list without prop-drilling
 * a new value through 26 themes.
 */

export type PriceListType = "normal" | "campaign" | "special";

/** Coerce an arbitrary backend value to a known PriceListType. Unknown
 *  / missing / null all degrade to "normal" — fully backward compatible
 *  with menus saved before the field existed. */
function normalizePriceListType(raw: unknown): PriceListType {
  return raw === "campaign" || raw === "special" ? raw : "normal";
}

/**
 * Find the menu whose plan window covers `now`. Standalone twin of the
 * `activeMenu` useMemo in useRestaurant — kept here so non-hook code
 * (cart helpers, ProductCard price math) can resolve the active menu
 * without a React render. Returns the FIRST matching menu, same as the
 * hook.
 */
export function findActiveMenu(menus: Menu[] | undefined | null): Menu | null {
  if (!menus || menus.length === 0) return null;
  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  for (const menu of menus) {
    for (const plan of menu.plans) {
      if (plan.days.includes(day) && time >= plan.startTime && time <= plan.endTime) {
        return menu;
      }
    }
  }
  return null;
}

/** The price list dictated by the currently-active menu, or "normal"
 *  when no menu is active / the field is missing. */
export function getActivePriceListType(): PriceListType {
  const menus = useRestaurantStore.getState().restaurantData.menus;
  const active = findActiveMenu(menus);
  return normalizePriceListType(active?.priceListType);
}

/**
 * Resolve the BASE (non-campaign) price for a portion under a given
 * price list. The "campaign"/"special" lists fall back to the normal
 * `price` when their column is null or 0 — so a product that only has
 * a normal price still shows that price under any list (spec point 3).
 */
export function resolveBasePrice(portion: Portion, priceListType: PriceListType): number {
  if (priceListType === "campaign") {
    return portion.campaignPrice != null && portion.campaignPrice > 0
      ? portion.campaignPrice
      : portion.price;
  }
  if (priceListType === "special") {
    return portion.specialPrice != null && portion.specialPrice > 0
      ? portion.specialPrice
      : portion.price;
  }
  return portion.price;
}

/**
 * One-call convenience used by the per-card `getPriceDisplay` "normal"
 * branch and the cart total math: resolve a portion's base price using
 * whatever menu is active right now. No arguments, no prop-drilling.
 */
export function resolveActiveBasePrice(portion: Portion): number {
  return resolveBasePrice(portion, getActivePriceListType());
}
