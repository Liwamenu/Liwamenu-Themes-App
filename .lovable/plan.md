
## Issue

The iframe is rendering but its height is being clamped too small (≈200px), cutting off most of the announcement content. Two root causes:

1. **`flex-1 min-h-0` on the iframe overrides the inline `style.height`** set by `resizeIframe()`. Flexbox `flex-1` forces the iframe to fill available space inside a parent that has no explicit height, so the measured height never sticks.
2. **Initial height fallback is 200px** and the parent uses `max-h-[90vh]` without a min, so when measurement fails (cross-origin script timing) it stays tiny.

Also, when the inner HTML uses `min-h-screen` / `h-screen` (very common in Tailwind announcement templates), `documentElement.scrollHeight` reports the iframe's own viewport height rather than the content's natural height — so we measure the wrong thing.

## Fix

### File: `src/components/menu/AnnouncementModal.tsx`

**A. Stop fighting flexbox**
- Remove `flex-1 min-h-0` from the iframe; let its inline `height` (set by `resizeIframe`) be the source of truth.
- Remove `flex flex-col` + `max-h-[90vh]` from the outer modal container; instead let the container size to its children. Keep `max-w-md w-full`.

**B. Better measurement**
- In the injected fragment shell, neutralize `min-h-screen` / `h-screen` by adding CSS:
  ```css
  html, body { min-height: 0 !important; height: auto !important; }
  ```
- For full-doc HTML, inject the same override via a `<style>` tag appended to `<head>` after sanitization (or via `srcDoc` post-processing).
- Measure using `Math.max(body.scrollHeight, body.offsetHeight, documentElement.scrollHeight, documentElement.offsetHeight)`.
- Raise initial height fallback from 200 → 400.
- Cap at `window.innerHeight * 0.9` minus footer height (~64px) so the OK button stays visible.

**C. Footer pinning**
- Keep footer outside the iframe but inside the modal container. Use a wrapper that's `flex flex-col`, iframe gets natural height (not flex-1), footer is `shrink-0`.
- Add `overflow-y: auto` to the modal container so if content is taller than 90vh the whole modal (iframe + footer) scrolls together — but iframe height is already clamped, so this is a safety net.

**D. ResizeObserver loop fix**
- Wrap the `ResizeObserver` callback in `requestAnimationFrame` to silence the "ResizeObserver loop completed" runtime error.

### Files to fix forwardRef warnings (quietly, mentioned per instructions only if related)
- Console shows `AnnouncementModal` and `FlyingEmoji` ref warnings. `AnnouncementModal` already uses `forwardRef` — warning is from theme-2/3/4 wrappers re-exporting via `export { AnnouncementModal } from ...` which is fine; warning likely stale from HMR. Will not touch unless it persists.

## Out of scope
- No theme-level changes
- No backend or sanitizer changes
- No new dependencies

## Files modified
1. `src/components/menu/AnnouncementModal.tsx` — iframe height strategy + shell CSS overrides + RO rAF wrap.
