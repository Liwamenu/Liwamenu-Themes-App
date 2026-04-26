## Goal
Stop mobile browser crashes (iOS/Android, Safari/Chrome) on Themes 3 and 4 for restaurants with very large menus, by reducing simultaneously-mounted DOM nodes, decoded images, and GPU layers.

---

### 1. Infinite scroll rendering (Themes 3 & 4)

Replace the current "render every product in every category" approach with a **scroll-triggered progressive renderer**.

- Default visible product count: **50**.
- When the user nears the bottom of the list (IntersectionObserver sentinel ~600px before end), load the **next 50**.
- Continue until all filtered products are rendered.
- Reset the counter back to 50 whenever:
  - `searchQuery` changes,
  - `activeCategory` changes (incl. switching to/from the `__campaign__` tab),
  - `categories` reference changes (tenant reload).

**Implementation detail (both `theme-3/MenuPage.tsx` and `theme-4/MenuPage.tsx`)**:
- Build a single flat list `[{ category, product }, ...]` from `filteredCategories` in the order they currently render.
- Slice `[0, displayCount]` and group back by category for rendering, so category headers/banners only appear if at least one of their products is in the visible slice.
- Use a hidden `<div ref={sentinelRef} />` after the last rendered section; an `IntersectionObserver` with `rootMargin: "600px"` increments `displayCount` by 50.
- Disconnect the observer when `displayCount >= total`.

This keeps the existing scroll-spy category highlighting working (it reads `categoryRefs` which only exist for mounted sections — acceptable, the active category just updates as more sections mount).

---

### 2. Remove expensive Framer Motion `layout` animations from product grids

In Themes 3 and 4, the product grids currently wrap every card in `<AnimatePresence mode="popLayout">` and the cards themselves use `layout` + `initial/animate/exit`. With 200+ cards this is a major source of mobile memory pressure and main-thread work.

- `src/themes/theme-3/ProductCard.tsx` and `src/themes/theme-4/ProductCard.tsx`:
  - Drop `layout`, `initial`, `animate`, `exit`, `whileHover`. Keep only `whileTap={{ scale: 0.98 }}` (cheap, transform-only).
- `src/themes/theme-3/MenuPage.tsx` and `src/themes/theme-4/MenuPage.tsx`:
  - Remove `<AnimatePresence mode="popLayout">` wrappers around the product grid maps. Render plain children.

Also add CSS containment hints to the cards (matches what Theme 1 already does):
```tsx
style={{ contentVisibility: "auto", containIntrinsicSize: "320px" } as React.CSSProperties}
```
This lets the browser skip rendering off-screen cards entirely.

---

### 3. Theme 4 category banner image optimization

Theme 4 currently uses a CSS `background-image: url(...)` on every category banner. Browsers eagerly decode all of them when the section mounts.

- Replace each category banner's CSS `background-image` with a real `<img loading="lazy" decoding="async" />` positioned absolutely behind the gradient overlay.
- Same for the campaign banner if it ever uses an image.
- Hero banner (top of page) stays as `background-image` (only one).

This pairs with the infinite-scroll change above: banners for not-yet-rendered sections never decode.

---

### 4. Theme 4 remaining `backdrop-blur`

`src/themes/theme-4/MenuPage.tsx` line ~282 still uses `bg-background/95 backdrop-blur-sm` on the sticky search bar. Replace with solid `bg-background border-b border-border`. Same for any other `backdrop-blur*` in Theme 4 that sits on a scrolling parent.

---

### 5. Harden `AnnouncementModal` ResizeObserver / timers

`src/components/menu/AnnouncementModal.tsx` currently:
- schedules `setTimeout(resizeIframe, ...)` at 100/400/1000/2000ms with no clearing,
- attaches `ResizeObserver` but only disconnects on the next iframe load,
- keeps the iframe mounted even when `isOpen` is false (component returns null inside `AnimatePresence`, but `srcDoc` is computed regardless).

Changes:
- Track timeout IDs in a ref array; on `handleIframeLoad` re-entry and on unmount, clear all pending timeouts.
- On unmount, call `(iframe as any)._ro?.disconnect?.()` and null it out.
- Only compute `srcDoc` and render the `<iframe>` when `isOpen` is true (gate with the existing `AnimatePresence` so the iframe element is actually unmounted on close → frees memory + stops the Tailwind CDN runtime).
- Add `loading="lazy"` to the iframe.

Behavior is unchanged for the user; memory is reclaimed cleanly between opens.

---

### 6. Files to edit

- `src/themes/theme-3/MenuPage.tsx` — infinite scroll, drop AnimatePresence/layout, sentinel observer.
- `src/themes/theme-3/ProductCard.tsx` — drop layout animations, add `contentVisibility`.
- `src/themes/theme-4/MenuPage.tsx` — infinite scroll, drop AnimatePresence/layout, sentinel observer, replace banner background-image with `<img loading="lazy">`, replace remaining `backdrop-blur`.
- `src/themes/theme-4/ProductCard.tsx` — drop layout animations, add `contentVisibility`.
- `src/components/menu/AnnouncementModal.tsx` — timeout cleanup, observer cleanup on unmount, gate iframe mount on `isOpen`.

### 7. Out of scope / preserved

- Existing memory rules (announcement shows once per `restaurantData` config, etc.) are preserved.
- Themes 1, 2, 5 are not modified.
- Search filtering, category scroll-spy, campaign tab, and all ordering flows continue to work unchanged.
- Cart, checkout, receipts, modals — untouched.

### 8. Validation after implementation

- On a large-menu tenant (200+ products), open Themes 3 and 4 on mobile and verify:
  - Initial paint shows ~50 products.
  - Scrolling smoothly loads the next 50 without visible jank.
  - Switching category resets to first 50 of the new category.
  - Searching resets to 50 results and grows on scroll.
  - Announcement modal opens, closes, and re-opens on reload without leaking memory (no console "ResizeObserver loop" warnings).
