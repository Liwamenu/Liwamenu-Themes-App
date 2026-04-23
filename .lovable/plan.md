

## Goal

Switch campaign detection from "price > 0" to the new product-level `isCampaign` flag, and allow displaying special/campaign prices even when they equal 0 (only `null`/`undefined` means "not set").

## New rules

**Campaign active for a portion when:**
- `product.isCampaign === true` AND
- `portion.campaignPrice != null` (0 is allowed, only null/undefined excluded)

**Special active for a portion when:**
- `restaurantData.isSpecialPriceActive === true` AND
- `portion.specialPrice != null` (0 is allowed)

**Priority unchanged:** special > campaign > normal.

## Type change

`src/types/restaurant.ts` — add to `Product`:
```ts
isCampaign?: boolean;
```

## Helper signature change

All `getPriceDisplay(portion, isSpecialPriceActive)` helpers gain a third arg `isCampaign: boolean`. `useCart.getPortionDisplayPrice` likewise gains `isCampaign`; `getTotal` passes `item.product.isCampaign`.

New condition pattern (replaces every `(x ?? 0) > 0` campaign/special check):
```ts
const hasSpecial  = isSpecialPriceActive && portion.specialPrice != null;
const hasCampaign = !!isCampaign && portion.campaignPrice != null;
```

## Files to edit

1. `src/types/restaurant.ts` — add `isCampaign?: boolean` on `Product`.
2. `src/hooks/useCart.ts` — update `getPortionDisplayPrice` signature + `null` checks; update `getTotal` to pass `item.product.isCampaign`.
3. `src/hooks/useRestaurant.ts` — `campaignProducts` filter becomes `p.isCampaign && p.portions.some(po => po.campaignPrice != null)`.
4. `src/components/menu/ProductCard.tsx` — null check + pass `product.isCampaign`.
5. `src/components/menu/ProductDetailModal.tsx` — same.
6. `src/components/menu/CheckoutModal.tsx` — `unitPrice` uses `campaignPrice` only when `item.product.isCampaign && campaignPrice != null`; same for special.
7. `src/themes/theme-2/ProductCard.tsx`, `theme-2/CartDrawer.tsx` — same.
8. `src/themes/theme-3/ProductCard.tsx`, `theme-3/ProductDetailModal.tsx`, `theme-3/CartDrawer.tsx` — same.
9. `src/themes/theme-4/ProductCard.tsx`, `theme-4/ProductDetailModal.tsx`, `theme-4/CartDrawer.tsx` — same.
10. `src/themes/theme-5/ProductCard.tsx` — same.
11. `src/data/restaurant.ts` — add `isCampaign: true` to dummy products that already define a `campaignPrice` so preview matches.
12. `mem://features/campaign-products/system-and-ui` + `mem://index.md` — note campaign is driven by `product.isCampaign` flag; `null` (not 0) means "no special/campaign price".

## Out of scope

- No UI/visual changes — only the gating condition + null-vs-zero semantics.
- No backend / API changes.
- Special price activation toggle (`isSpecialPriceActive`) unchanged.

