---
name: Announcement HTML Trust Boundary
description: Backend announcement HTML executes JavaScript inside an iframe — only trust restaurant-admin-authored content.
type: constraint
---

The `AnnouncementModal` iframe runs with `allow-scripts allow-same-origin`, which means any HTML returned via `restaurantData.announcementSettings.htmlContent` can execute JavaScript with same-origin access to the iframe document (and read parent cookies via DOM if isolation is broken).

**Why:** This was an explicit product decision to support Tailwind CDN and rich rendering parity with admin-authored HTML.

**How to apply:**
- Treat `announcementSettings.htmlContent` as trusted, admin-only authored content from the restaurant backend.
- Never accept user-generated HTML through this surface.
- If the threat model changes (e.g., multi-tenant editors, untrusted authors), tighten by removing `allow-scripts` from the iframe sandbox in `src/components/menu/AnnouncementModal.tsx` and re-add `FORBID_TAGS: ["script"]` to DOMPurify.
