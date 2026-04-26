## Why mobile crashes only on some restaurants (themes 3 & 4)

The crashes are caused by **CSS that's fine on desktop but pathological on mobile GPUs**, and only triggers on restaurants with **many categories or large hero/category images**. That's why your phone crashes on some restaurants and not others, and why your desktop never crashes.

### Root cause #1 — Theme 4: `background-attachment: fixed` everywhere
`src/themes/theme-4/MenuPage.tsx`:
- Line 308: hero banner (`50vh`) uses `backgroundAttachment: "fixed"` with `restaurant.imageAbsoluteUrl`
- Line 366: **every category section banner** (`40vh`) uses `backgroundAttachment: "fixed"` with `category.image`

A restaurant with 8 categories renders **9 large fixed-attachment background images** stacked on one page. iOS Safari and mobile Chrome repaint the entire viewport on every scroll frame for fixed backgrounds — combined GPU memory blows past the per-tab limit (~200–400 MB on iOS) and the tab is killed. This is a long-known mobile killer (`-webkit-overflow-scrolling` interaction) and matches the "only on mobile, only some restaurants" pattern exactly.

### Root cause #2 — Theme 3: stacked backdrop-blur over scrolling content
`src/themes/theme-3/MenuPage.tsx`:
- Line 181: sticky header uses `backdrop-blur-lg` (large radius, expensive)
- Line 224: every recommended-product chip uses `backdrop-blur-sm`
- Plus modal overlays also use `backdrop-blur-sm`

`backdrop-filter: blur()` re-samples the layer beneath every frame. A sticky `backdrop-blur-lg` over a scrolling menu with many product cards is enough to push low-end mobile devices over the edge, especially combined with the AnnouncementModal iframe.

### Why "only some restaurants"
Both failure modes scale with **number of categories** and **size of `restaurant.imageAbsoluteUrl` / `category.image`**. Restaurants with few categories or small images survive; restaurants with many categories and large hero images crash.

---

## Proposed fix (CSS/markup only, no logic changes)

### Theme 4 — `src/themes/theme-4/MenuPage.tsx`
1. **Remove `backgroundAttachment: "fixed"` from the hero banner** (line 308). Keep the background image but let it scroll normally. Optionally simulate the parallax feel with a cheap `transform: translateZ(0)` wrapper — but plain scroll is the safe choice.
2. **Remove `backgroundAttachment: "fixed"` from every category banner** (line 366). Same rationale — this is the multiplier that kills mobile.
3. Optionally add `loading="lazy"` semantics by switching the category banners from `background-image` to a real `<img>` with `loading="lazy"` so off-screen banners aren't decoded until needed. (Recommended but optional — happy to defer.)

### Theme 3 — `src/themes/theme-3/MenuPage.tsx`
1. **Downgrade the sticky search header** from `backdrop-blur-lg` to a solid `bg-background` (no blur). Removes the per-frame re-sample.
2. **Drop `backdrop-blur-sm` from the recommended-product label chip** (line 224) — replace with a slightly stronger solid `bg-black/80` so the text stays readable without the blur cost.

### Out of scope
- Not touching `AnnouncementModal.tsx` (declined previously).
- Not touching modal overlays' `backdrop-blur-sm` — these only render while a modal is open, so they aren't on the always-on hot path.
- No changes to themes 1, 2, 5 — they don't show the issue.

### Expected result
- Mobile tabs stop crashing on theme-4 restaurants regardless of category count or image size.
- Theme-3 scrolling becomes noticeably smoother on low-end Android.
- Visual change is minimal: hero/category banners scroll with the page instead of pinning (a parallax effect most users don't notice on mobile, since iOS Safari already silently disables `background-attachment: fixed` in many contexts).

### Files to edit
- `src/themes/theme-4/MenuPage.tsx` (2 small style changes)
- `src/themes/theme-3/MenuPage.tsx` (2 small className changes)
