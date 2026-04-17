
## Why the popup looks broken

The example HTML relies on three things that the current modal blocks or hides:

1. **Tailwind CDN script** (`<script src="https://cdn.tailwindcss.com">`) — currently stripped by `DOMPurify` (`FORBID_TAGS: ["script"]`) and blocked by the iframe sandbox. So all `bg-white`, `rounded-2xl`, `text-center`, etc. classes do nothing → unstyled stacked text (matches screenshot 1).
2. **Google Fonts `<link>`** — kept by sanitizer, but the iframe also needs `allow-same-origin` (already on).
3. **Outer chrome** — our modal wraps the iframe in its own dark gradient card + footer "Tamam" button + top accent bar. The backend HTML already designs its own card, so we get a card-inside-a-card and a duplicated CTA.

You confirmed: **allow scripts**. That unlocks Tailwind CDN and full parity with the example.

## Fix

### File: `src/components/menu/AnnouncementModal.tsx`

**A. Allow scripts in sanitization and iframe sandbox**
- Drop `FORBID_TAGS: ["script"]`; instead use a permissive `DOMPurify` config that keeps `<script>`, `<link>`, `<style>`, `<meta>` (use `ADD_TAGS` + `FORCE_BODY: false`, or sanitize with `WHOLE_DOCUMENT` when input is a full doc).
- Change iframe `sandbox` to `"allow-same-origin allow-scripts allow-popups"` so Tailwind CDN executes and links open.
- Keep CSP-friendly: still `referrerPolicy="no-referrer"`, no parent-frame access (sandbox token order matters: do NOT combine `allow-scripts` + `allow-same-origin` if we want isolation… but user explicitly accepted the risk for fidelity).

**B. Make the modal a transparent shell so backend HTML is the design**
- Remove the inner gradient card background, the top accent bar, the two blurred decorative blobs, the bottom border + "Tamam" button bar.
- Keep only: backdrop, close (X) button (top-right, floating over iframe), and the iframe itself.
- Container becomes: `max-w-md w-full max-h-[90vh] rounded-2xl overflow-hidden bg-transparent shadow-2xl`.
- Iframe occupies full container; auto-resize logic stays.

**C. Auto-height tweaks**
- After `load`, also poll height a few times (Tailwind CDN injects styles asynchronously which changes layout post-load). Add 3 delayed re-measures (100ms, 400ms, 1000ms) in addition to existing `ResizeObserver`.
- Increase max height to `90vh` to match the new chrome-less modal.

**D. Fragment shell stays** (when backend sends a `<div>` only) — same wrapper, but inject `<script src="https://cdn.tailwindcss.com"></script>` is NOT auto-added (only when backend includes it).

### Memory update
- Update `mem://features/announcement-system` to note: scripts are allowed inside the iframe (Tailwind CDN supported), modal renders backend HTML chrome-less.
- Add a `mem://constraints/announcement-html-trust`: "Backend announcement HTML executes JS inside an iframe — only trust restaurant-admin-authored content."

## Out of scope
- Theme files (no changes; all 5 already mount `AnnouncementModal` correctly).
- Backend HTML format (we adapt to whatever they send).
- Localization of the dropped "Tamam" button (close X covers dismissal).

## Files modified
1. `src/components/menu/AnnouncementModal.tsx` — sandbox + sanitizer + chrome removal + delayed re-measure.
2. `.lovable/memory/features/announcement-system.md` — updated.
3. `.lovable/memory/constraints/announcement-html-trust.md` — new.
