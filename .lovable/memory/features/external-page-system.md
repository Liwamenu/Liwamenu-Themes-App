---
name: External Page System
description: externalPageHTML/externalPageImage/externalPageButtonName fields render as category-like tab opening fullscreen HTML/image view
type: feature
---

Three optional fields on `RestaurantData`:
- `externalPageHTML` (string | null) — HTML content, preferred over image when both exist
- `externalPageImage` (string | null) — fallback image URL
- `externalPageButtonName` (string | null) — button label shown as a category tab

Button appears styled like a category in each theme's tab bar (or as a CategoryBanner in theme-6 accordion).
Clicking opens `ExternalPageView` (shared component at `src/components/menu/ExternalPageView.tsx`) — a fullscreen overlay with no header/footer, just the content + a close (X) button.
HTML is rendered via iframe with DOMPurify sanitization; image shown with object-contain.