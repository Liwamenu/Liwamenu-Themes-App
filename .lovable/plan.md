

## Issue

`restaurant.tableNumber` is held only in the in-memory Zustand store (`useRestaurantStore`). On page refresh:

1. The store re-initializes from `restaurantData` (no table).
2. `useInitializeRestaurant` reads `tableNumber` only from the **URL query param** (`?tableNumber=...`).
3. So if the user typed the URL manually and later scanned a QR (or used "Change Table"), the new table is set in memory only — refresh wipes it.

## Fix

Persist `tableNumber` in `localStorage` with the same 2-hour TTL already used for cart/orders, scoped per tenant so different restaurants don't collide.

### File: `src/hooks/useRestaurant.ts`

1. On store creation, read an initial `tableNumber` from `localStorage` (key: `restaurant-table-<tenant>`) if not expired, and merge it into `restaurantData.tableNumber`.
2. Wrap `setTableNumber` so it also writes `{ value, __savedAt: Date.now() }` to localStorage under the same key (or removes it if value is empty).
3. In `useInitializeRestaurant`, after fetching `restaurantData`:
   - Priority order for tableNumber: **URL param** > **persisted localStorage value** > **backend value (none)**.
   - If URL param is present, write it to localStorage too (so QR-deep-link survives refreshes that drop the query string — though normally the URL stays).
   - If no URL param but a valid persisted value exists, apply it.
4. Start a periodic TTL eviction timer (reuse `startTTLEvictionTimer` from `src/lib/persistTTL.ts`) to clear the key after 2h, and also clear from the in-memory store via `setTableNumber("")` on eviction.

### Storage key

`restaurant-table-<tenant>` where `<tenant>` comes from `getTenant()` in `src/lib/api.ts`. This prevents one tenant's table from leaking to another.

### TTL

2 hours, matching cart and order history (consistent "session" semantics).

### What this also fixes

- Manual URL entry → QR scan → refresh: table now persists.
- "Change Table" modal selection: now persists across refreshes.
- After 2h of inactivity, table is auto-cleared (consistent with cart/order TTL).

## Out of scope

- No theme changes (all themes consume the same `useRestaurant` hook).
- No backend changes.
- URL-based tenant detection unchanged.
- No UI changes.

## Files modified

1. `src/hooks/useRestaurant.ts` — read/write `tableNumber` to localStorage with 2h TTL, prioritize URL > persisted on init, wrap `setTableNumber` to persist.
2. `mem://features/qr-code-table-scanning` + `mem://index.md` — note that `tableNumber` is now persisted with 2h TTL per tenant.

