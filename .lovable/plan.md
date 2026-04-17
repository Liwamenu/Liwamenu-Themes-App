
## Change

Remove the `sessionStorage` "hasSeenAnnouncement" gate so the announcement modal shows on every page load/refresh.

## Files to modify

All 5 theme `MenuPage.tsx` files use the same pattern:
1. `src/themes/theme-2/MenuPage.tsx`
2. `src/themes/theme-3/MenuPage.tsx`
3. `src/themes/theme-4/MenuPage.tsx`
4. `src/themes/theme-5/MenuPage.tsx`
5. `src/components/menu/MenuPage.tsx` (theme-1)

## What to change

In each file, locate the announcement effect that reads/writes `sessionStorage.getItem("hasSeenAnnouncement")` and:
- Remove the `sessionStorage.getItem(...)` guard
- Remove the `sessionStorage.setItem("hasSeenAnnouncement", "true")` call
- Keep the rest of the trigger logic (delay, `announcementSettings.isActive`, htmlContent presence)

Result: every refresh re-triggers the modal as long as the backend has it active.

## Out of scope
- No changes to `AnnouncementModal.tsx` itself
- No backend changes
- Memory `mem://features/announcement-system` will be updated to reflect "per refresh" instead of "once per session"
