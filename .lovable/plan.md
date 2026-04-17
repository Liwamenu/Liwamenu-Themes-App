## Issues

### 1. HTML styles stripped in announcement modal

In `src/components/menu/AnnouncementModal.tsx`:

```ts
DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true })
```

`WHOLE_DOCUMENT: true` expects the input to actually be a complete `<html>` document. When the backend sends a fragment with `<style>` blocks and styled `<div>`s (like the Lezzet Kampanyası HTML in the screenshot), DOMPurify either drops the `<style>` tags or wraps things in a way that breaks the cascade. Result: raw text with browser defaults — exactly what the screenshot shows.

Also: the iframe is forced to `h-[60vh]` which clips content and doesn't reflect the announcement's intended sizing.

### 2. Announcement only shows once per session across all themes

All 5 themes use the same `sessionStorage` key `hasSeenAnnouncement`. That part is correct (one-time per session is the intended UX). The user's perception that it "isn't showing in all themes" is most likely because:

- They saw it once in one theme → sessionStorage flag set → switching themes/refreshing within the session never re-triggers it.

This is actually intentional behavior, but worth confirming.

## Fix

### File: `src/components/menu/AnnouncementModal.tsx`

**A. Stop forcing `WHOLE_DOCUMENT`.** Sanitize as a fragment, then always wrap in our own document shell that preserves `<style>` tags and inline styles:

```ts
const srcDoc = useMemo(() => {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["style", "target"],
    FORBID_TAGS: ["script"],
  });
  const isFullDoc = /<html[\s>]/i.test(sanitized) || /<!doctype/i.test(sanitized);
  if (isFullDoc) return sanitized;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      html,body{margin:0;padding:0;background:transparent;
        font-family:system-ui,-apple-system,'Kumbh Sans',sans-serif;color:#111;
        word-wrap:break-word;overflow-x:hidden;}
      *{box-sizing:border-box;}
      img,video{max-width:100%;height:auto;display:block;}
      a{color:inherit;}
    </style></head><body>${sanitized}</body></html>`;
}, [htmlContent]);
```

**B. Auto-resize the iframe** to its content height (capped) instead of fixed `60vh`, so the styled banner shows naturally:

- Add `ref` to iframe + `onLoad` handler that measures `iframe.contentDocument.documentElement.scrollHeight` and applies it as inline height (clamped between e.g. `200px` and `calc(85vh - 140px)`).
- Listen for resize via a `ResizeObserver` on the iframe document body to handle late image loads.

**C. Optional**: confirm sessionStorage semantics. Plan keeps current "once per session" logic — no change unless the user wants per-theme reset.

## Out of scope

- No theme-level changes (all 5 themes already correctly mount `AnnouncementModal`).
- No backend change.
- No new dependency.

## Files modified

1. `src/components/menu/AnnouncementModal.tsx` — sanitization config + iframe auto-height.