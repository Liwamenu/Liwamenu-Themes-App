## Goal

Extend the existing `hide` gate in `ThemeRouter` so the themes are also blocked (with the same localized "Menu Unavailable" style message) when **any** of the following is true:

- `restaurantData.hide === true` (already handled)
- `restaurantData.isActive === false` (restaurant disabled)
- `restaurantData.userIsActive === false` (account owner disabled) — **new field**
- `restaurantData.licenseIsActive === false` (license expired/inactive)

In all these cases, render the same fallback UI used today for `hide` (no themes, no header, no menu) — language picked from browser → `menuLang` → English.

## Why one shared fallback

Same UX intent ("this menu can't be shown right now") and same data signal source. Keeps logic centralized in `ThemeRouter` (single source of truth) instead of leaking into every theme.

## Type change

`src/types/restaurant.ts` — add to `RestaurantData`:
```ts
userIsActive?: boolean;
```
(Optional to stay backward-compatible with current backend payloads. Treated as `true` when omitted, so existing tenants keep working.)

## Logic change

`src/themes/ThemeRouter.tsx`:

1. Destructure the new flags from the store:
   ```ts
   const { themeId, products, hide, menuLang, isActive, licenseIsActive, userIsActive } =
     useRestaurantStore(useShallow((s) => ({
       themeId: s.restaurantData.themeId,
       products: s.restaurantData.products,
       hide: s.restaurantData.hide,
       menuLang: s.restaurantData.menuLang,
       isActive: s.restaurantData.isActive,
       licenseIsActive: s.restaurantData.licenseIsActive,
       userIsActive: s.restaurantData.userIsActive,
     })));
   ```
2. Compute one combined gate:
   ```ts
   const isBlocked =
     hide ||
     isActive === false ||
     licenseIsActive === false ||
     userIsActive === false; // undefined => allowed
   ```
3. Replace `if (hide) return <HiddenRestaurantFallback ... />;` with `if (isBlocked) return <HiddenRestaurantFallback menuLang={menuLang} />;`

No changes to `HIDDEN_MESSAGES` — same copy for all blocked reasons (per request: "just show a message based on the browser language").

## `useRestaurant.isRestaurantActive`

Already returns `data.isActive && data.licenseIsActive && !data.hide`. Update to also factor `userIsActive` so downstream cart/checkout gates stay consistent:
```ts
return data.isActive && data.licenseIsActive && data.userIsActive !== false && !data.hide;
```

## Files to edit

1. `src/types/restaurant.ts` — add `userIsActive?: boolean` to `RestaurantData`.
2. `src/themes/ThemeRouter.tsx` — pull new flags from store, compute `isBlocked`, render fallback for any blocked reason.
3. `src/hooks/useRestaurant.ts` — include `userIsActive !== false` in `isRestaurantActive` memo.
4. `mem://architecture/error-and-empty-state-handling` + `mem://index.md` — note that the `ThemeRouter` block-gate now covers `hide`, `isActive`, `licenseIsActive`, and `userIsActive`.

## Out of scope

- No new translations or per-reason messages — single shared "Menu Unavailable" copy.
- No backend / API changes.
- No theme-internal UI changes.
- Dummy data in `src/data/restaurant.ts` stays as-is (all flags already true / field optional).
