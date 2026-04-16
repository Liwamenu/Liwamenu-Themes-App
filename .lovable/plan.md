

## Issue
Backend returns `latitude: 41510562, longitude: 36115188` (no decimal). Real value is `41.510562, 36.115188`. Distance calc treats them as raw numbers → 4043.1 km error.

## Root cause
`useLocation.checkDistance` / `getDistanceFromRestaurant` pass `restaurantData.latitude/longitude` directly into `calculateDistance` without normalizing.

## Fix
Add a normalizer: if `Math.abs(value) > 180`, divide by `10^(digits - 2)` so `41510562 → 41.510562`. Apply to both lat & lng wherever restaurant coords are read.

## Files
1. `src/hooks/useLocation.ts` — add `normalizeCoord(n)` helper, apply inside `calculateDistance` callers (or wrap restaurant coords at entry of `checkDistance`, `checkDistanceWithCoords`, `getDistanceFromRestaurant`, `getDistanceWithCoords`).
2. Check callers in `CheckoutModal` variants (base + theme-2..5) — if any pass `restaurantData.latitude` directly, no change needed since normalization happens inside the hook.

## Logic
```ts
const normalizeCoord = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return n;
  const abs = Math.abs(n);
  if (abs <= 180) return n; // already decimal
  // shift decimal so integer part is 1-3 digits
  const intDigits = Math.floor(Math.log10(abs)) + 1;
  return n / Math.pow(10, intDigits - 2);
};
```
Apply to user coords too (defensive), though `navigator.geolocation` always returns proper decimals.

## Out of scope
No backend changes; no UI changes.

