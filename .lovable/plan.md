## Goal
Resolve four concrete issues with the Themes 3 & 4 progressive renderer:

1. White flash mid-scroll and only ~10-15 products loading after the first 50.
2. Footer briefly visible before the next batch loads ("footer flash").
3. Scrolling sometimes stalls when crossing a category boundary.
4. Clicking a category in the bottom tab bar does not jump to it when that category is not yet rendered.

---

### Root causes

- `useInfiniteProducts` slices a single flat list across all categories. Categories beyond the first ~50 products are **never mounted** until you scroll there, so `categoryRefs.current[id]` is `null` for them and `scrollToCategory` becomes a no-op.
- The sentinel is a 10px div placed **directly above the footer**. By the time the IntersectionObserver fires, the footer is already visible.
- Page size is 50 (small for a fast scroller on mobile) → user blasts past the trigger before React commits the next batch, producing a perceived "stuck at 60-65 products" state.
- The observer effect re-creates the observer on every `displayCount` change; combined with the small sentinel and zero bottom padding, the scroll position can land in a brief empty gap → white flash.
- Smooth scroll on iOS interacts badly with layout growth happening mid-animation; clicking a category currently calls `window.scrollTo({ behavior: "smooth" })` while the page height is still expanding from a recent batch load.

---

### Changes

#### 1. `src/hooks/useInfiniteProducts.ts` — bigger batches, bigger trigger zone, render-ahead

- Bump `PAGE_SIZE` from `50` → **`100`**.
- Replace the increment `Math.min(c + PAGE_SIZE, Math.max(total, c + PAGE_SIZE))` with `Math.min(c + PAGE_SIZE, total)` (clean clamp, no `Math.max` quirk).
- Expand observer `rootMargin` from `"600px 0px"` → **`"1500px 0px"`** so the next 100 products start mounting **well before** the user reaches the footer area.
- Add a `loadMore()` callback in the return value so callers can imperatively trigger a batch load (used by the category-jump fix below).
- Add a second exposed helper: `ensureCategoryRendered(categoryId: string)` that bumps `displayCount` to whatever total is needed so the requested category and **everything before it** is mounted. Implementation: walk `categories` accumulating `products.length`; once the matching id is found, `setDisplayCount(Math.max(currentCount, accumulatedTotal))`.

#### 2. `src/themes/theme-3/MenuPage.tsx` & `src/themes/theme-4/MenuPage.tsx` — fix category jump + footer flash + scroll lock

- Pull `ensureCategoryRendered` out of the `useInfiniteProducts` return.
- Rewrite `scrollToCategory(categoryId)`:
  1. Call `ensureCategoryRendered(categoryId)` first.
  2. `setActiveCategory(categoryId)`.
  3. In a `requestAnimationFrame` (after React commits and the section is in the DOM), look up `categoryRefs.current[categoryId]`.
  4. If it exists, scroll with `behavior: "auto"` (instant) instead of `"smooth"`. Instant scroll avoids the iOS smooth-scroll-vs-layout-growth bug and matches user intent for tab clicks. Keep the existing 80/140px header offset.
  5. If still missing (edge case during very first paint), fall back to a single retry on the next frame.
- Increase the sentinel from `h-10` to a real spacer: `h-[60vh]` and add `aria-hidden`. Reasoning: the sentinel itself becomes the buffer between the last loaded section and the footer, so even if the next batch is still loading, the user never sees the footer first. As soon as the batch lands, the sentinel un-mounts (since `hasMore` flips to `false` once everything is loaded) and the footer slides up naturally.
- Move the `<Footer />` render to be conditional on `!hasMore` **OR** keep it always rendered but ensure it sits beneath the tall sentinel. Picking the simpler option: keep `<Footer />` always rendered, rely on the tall sentinel to push it offscreen until ready. (No conditional unmount of footer — avoids layout jank when reaching the end.)
- Add a small visible loading indicator inside the sentinel (`<div className="py-8 text-center text-sm text-muted-foreground">{t("menu.loadingMore") || "Loading…"}</div>`) so users see progress instead of an empty white area. Use the existing `t` from `useTranslation`; if the key is missing, the literal fallback renders.

#### 3. Scroll-spy stability

The existing window scroll listener in both themes iterates `categories` and reads `categoryRefs.current[category.id]`. With incremental mounting that's fine — sections that aren't mounted return `null` and are simply skipped. No change needed there beyond the new render-ahead logic above.

#### 4. Translation key (optional, additive only)

- Add `menu.loadingMore: "Loading more…"` to `src/locales/en/translation.json` (and a hardcoded English fallback at the call site so missing translations don't show the raw key). Other locales fall back to English via the existing i18n config.

---

### Files to edit

- `src/hooks/useInfiniteProducts.ts` — page size 100, larger rootMargin, add `ensureCategoryRendered` + `loadMore`.
- `src/themes/theme-3/MenuPage.tsx` — use `ensureCategoryRendered` in `scrollToCategory`, instant scroll, tall sentinel with loading text.
- `src/themes/theme-4/MenuPage.tsx` — same changes as theme-3.
- `src/locales/en/translation.json` — add `menu.loadingMore` key.

### Out of scope / preserved

- All existing performance wins from the previous pass (no `layout` animations, `contentVisibility`, lazy banner `<img>`, AnnouncementModal hardening, no `backdrop-blur`).
- Themes 1, 2, 5 — untouched.
- Search behavior, campaign tab logic, cart/checkout/receipt flows — unchanged.
- Category banner heights, ProductCard markup — unchanged.

### Validation after implementation

On a large-menu tenant (200+ products) on mobile Theme 3 and Theme 4:
- First paint shows ~100 products.
- Fast-scrolling reaches the bottom and the next 100 are already mounted before the footer appears (no white flash, no footer flash).
- Tapping any category in the bottom bar — including ones far down the list — instantly scrolls to that section.
- Smooth scrolling does not stall when crossing category boundaries.
- Switching category or typing in search resets to the first 100 of the new view and grows on scroll.