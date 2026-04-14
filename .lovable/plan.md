

## Problem
Theme 4 still has horizontal scrolling despite the header fix. The overflow comes from:
1. The root page container (`div.theme-4`) has no overflow constraint
2. The hero section restaurant name (`text-5xl uppercase tracking-wider`) can exceed viewport width on mobile
3. Category banner titles similarly overflow

## Fix

**File: `src/themes/theme-4/MenuPage.tsx`**

1. **Line 272** - Add `overflow-x-hidden` to the root container:
   - `<div className="theme-4 min-h-screen bg-background pb-20">` → `<div className="theme-4 min-h-screen bg-background pb-20 overflow-x-hidden">`

2. **Line 313** - Make the hero restaurant name responsive and prevent overflow:
   - Add `break-words px-4 max-w-full` to the `h2` so the long name wraps instead of overflowing

3. **Line 332** - Same treatment for category banner titles:
   - Add `break-words px-4 max-w-full` to prevent overflow

These three changes will eliminate horizontal scrolling across the entire Theme 4 page.

