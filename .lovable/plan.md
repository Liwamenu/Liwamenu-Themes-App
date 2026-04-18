
## Plan

### Part A — Add distance check to Call Waiter (parity with in-person ordering)

**File:** `src/components/menu/CallWaiterModal.tsx`

- Import `useLocation` and `useRestaurant` (already imported).
- In `handleCallWaiter`, before `apiCallWaiter()`:
  - If `restaurant.checkTableOrderDistance` is true:
    - Call `getLocation()`.
    - Compute distance vs `restaurant.latitude/longitude` with max = `restaurant.maxTableOrderDistanceMeter / 1000`.
    - If out of range → show toast with formatted distance (reuse the `t("order.tableOrderOutOfRangeDistance", ...)` key already used in CheckoutModal) and abort.
    - On location permission errors, mirror CheckoutModal's behavior (toast with `order.locationError`).
- Re-export wrappers in `theme-2/3/4/5/CallWaiterModal.tsx` already pass through, no changes needed.

### Part B — Auto-expire stored data after 2 hours

**Files:** `src/hooks/useOrder.ts` and `src/hooks/useCart.ts`

**Approach:** Add a TTL wrapper around Zustand `persist`, write a `savedAt` timestamp on every state change, and on hydration drop the data if older than 2 hours.

1. **`useOrder.ts`** (already persisted)
   - Extend state with `savedAt: number`.
   - In `addOrder` / `updateOrderStatus`, set `savedAt = Date.now()`.
   - Add `onRehydrateStorage` callback in `persist` config: if `Date.now() - savedAt > 2 * 60 * 60 * 1000`, reset to `{ orders: [], currentOrder: null }`.
   - Also start a single `setInterval` (e.g. every 60s) inside the module to re-check and clear if expired while the tab stays open.

2. **`useCart.ts`** (currently in-memory only)
   - Decide: also persist with same 2h TTL? (recommended — matches user expectation of "session" being 2h).
   - Wrap with `persist` middleware (`name: 'restaurant-cart'`), store `savedAt`, same TTL eviction logic.

3. **Shared TTL helper** (optional cleanup): create `src/lib/persistTTL.ts` exporting `createTTLStorage(ttlMs)` returning a custom `StateStorage` that wraps `localStorage` and auto-clears expired entries on read. Both hooks then just pass `storage: createTTLStorage(2 * 60 * 60 * 1000)`.

### Open question

For Part A, when the user is out of waiter-call range, should we:
- (a) Block the call entirely with an error toast (matches in-person order behavior), or
- (b) Allow the call but show a warning?

Default: (a) — strict block, same as in-person ordering.

### Files modified
1. `src/components/menu/CallWaiterModal.tsx` — distance gate.
2. `src/hooks/useOrder.ts` — TTL eviction.
3. `src/hooks/useCart.ts` — persist + TTL eviction.
4. `src/lib/persistTTL.ts` (new) — shared TTL storage helper.
5. `.lovable/memory/features/waiter-call-system-constraints.md` — note the new distance gate.
6. `.lovable/memory/features/cart/item-merging-logic.md` + `mem://index.md` — note 2h persistence TTL.
