## Change

Re-add a localized close button ("Tamam" / "Okay") at the bottom of the announcement modal, in addition to the existing top-right X.

## Implementation

### File: `src/components/menu/AnnouncementModal.tsx`

- Below the iframe, add a footer bar inside the modal container with a single button that calls `onClose`.
- Button label uses i18n: `t("common.okay")` (already exists in `tr/translation.json` as "Tamam" and presumably across other locales — will fallback to "Okay").
- Style: full-width-ish, centered, rounded, white/translucent background so it sits on top of the transparent shell without fighting backend HTML colors. Use a subtle backdrop (`bg-white/95 backdrop-blur`) so it's readable regardless of the iframe content beneath.  
Color: Make the button background color same as the theme's primary color(dark/light theme should be considerd)
- Container layout: switch the modal inner wrapper to `flex flex-col` so iframe takes available space and footer pins below. Cap iframe `max-h` to leave room for the footer (e.g. `calc(90vh - 64px)`).
- Keep the top-right X button as a secondary dismissal.

### i18n

- Verify `common.okay` exists in all 11 locale files; if any are missing, add "Okay"/local equivalent. (TR already has "Tamam".)

## Out of scope

- No changes to themes, sanitizer, sandbox, or auto-resize logic.
- No backend/data changes.

## Files modified

1. `src/components/menu/AnnouncementModal.tsx` — add footer button + flex layout.
2. Any of the 11 `src/locales/*/translation.json` missing `common.okay` — add the key.