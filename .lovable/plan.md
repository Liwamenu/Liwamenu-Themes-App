

## Diagnosis

The "Can't open this page" error in Chrome iOS is **not** caused by the FlyingEmoji animation. That's a Chrome browser-level error (renderer crash / page kill) — JavaScript animations can't trigger that screen. Chrome shows this when:

1. The renderer process runs out of memory (common on iOS due to strict per-tab memory limits, especially with large images)
2. The page took too long to respond / hung the main thread
3. A network resource hard-failed during initial load

Looking at the code and the network log, the most likely culprits on mobile are:

### Likely root causes

**1. Massive unoptimized images (highest probability)**
- Product images (`product.imageURL`) and `imageAbsoluteUrl` come straight from `liwamenu.pentegrasyon.net` with no size constraints
- The recommended-products carousel and the product grid render every image at full resolution
- No `loading="lazy"`, no `decoding="async"`, no `width/height` attributes anywhere on `<img>` tags
- iOS Safari/Chrome WebView kills tabs that exceed ~250-400MB — easy to hit with 50+ full-size JPEGs

**2. The AnnouncementModal HTML payload**
- The `announcementSettings.htmlContent` returned from the backend is a **full standalone HTML document** (`<!DOCTYPE html>`, `<head>`, external Tailwind CDN script, Google Fonts, inline `<script>` with `window.onload`)
- This gets injected via DOMPurify into the DOM. If injected as-is into the page (not an iframe), the inline `<script>` and `window.onload` inside it can hijack the main page's load event and re-trigger modal logic, causing hangs or crashes on memory-constrained devices
- Loading the Tailwind CDN script a second time inside an already-running app is extremely heavy

**3. Heavy synchronous work on first render**
- 11 locale JSON files in `i18n.ts`, Firebase init, FCM token request, Zustand stores, multiple `useEffect` chains all firing on mount

The FlyingEmoji is a tiny Framer Motion animation — it's not the cause.

## Verification steps before fixing

I want to confirm by inspecting:
- `AnnouncementModal.tsx` — how `htmlContent` is rendered (innerHTML vs iframe)
- `ProductCard.tsx` — image rendering attributes
- `RestaurantHeader.tsx` — hero/logo image handling

## Proposed fix (after verification)

### A. Image optimization (mobile memory relief)
- Add `loading="lazy"` and `decoding="async"` to all `<img>` tags in:
  - `ProductCard.tsx` (all themes)
  - `MenuPage.tsx` recommended-products carousel (all themes)
  - `RestaurantHeader.tsx` (all themes)
- Add explicit `width`/`height` or aspect-ratio wrappers to prevent layout thrashing
- Above-the-fold first card can use `loading="eager"` + `fetchpriority="high"`

### B. AnnouncementModal isolation
- Render `htmlContent` inside a sandboxed `<iframe srcdoc={sanitizedHtml}>` instead of injecting into the main DOM
- This isolates the inline `<script>`, second Tailwind CDN load, and `window.onload` hijack
- Keeps DOMPurify as a defense-in-depth layer
- iframe gets `sandbox="allow-scripts"` (no same-origin → can't touch parent), fixed height, no scroll bleed

### C. Defer non-critical work
- Lazy-init Firebase messaging only after first user interaction (already partially done)
- Verify announcement modal `delayMs` (10s in payload) isn't competing with initial render

## Files to modify (estimated)

1. `src/components/menu/AnnouncementModal.tsx` — switch to iframe rendering
2. `src/components/menu/ProductCard.tsx` + theme-2/3/4/5 variants — lazy images
3. `src/components/menu/MenuPage.tsx` + theme-2/3/4/5 variants — lazy images in recommended carousel
4. `src/components/menu/RestaurantHeader.tsx` + theme variants — lazy hero/logo

Total: ~12-15 files, all small changes.

## What this does NOT need

- No FlyingEmoji changes (it's not the cause)
- No backend changes
- No new dependencies

