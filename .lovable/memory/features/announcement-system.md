---
name: Announcement System
description: Restaurant announcement modal triggers on every page load when enabled, renders backend HTML chrome-less inside a script-enabled iframe.
type: feature
---

The `AnnouncementModal` displays based on `announcementSettings` in `restaurantData`. It appears on every page load/refresh (no sessionStorage gate) after the configured `delayMs` when `announcementSettings.enabled` is true.

Rendering:
- HTML sanitized via DOMPurify with permissive config: `<script>`, `<link>`, `<style>`, `<meta>` allowed so backend HTML can use Tailwind CDN, Google Fonts, etc.
- Rendered inside an iframe with `sandbox="allow-same-origin allow-scripts allow-popups"`.
- Modal shell is chrome-less (transparent, no header/footer/CTA) — backend HTML defines the entire visual card. Only a floating close (X) button overlays the iframe.
- Auto-resizes via ResizeObserver + delayed re-measures (100/400/1000/2000ms) to handle async style injection (Tailwind CDN).
- Supports both full HTML documents and bare fragments (fragments wrapped in a minimal shell).
