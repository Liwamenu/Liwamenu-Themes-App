

## Problem
In Theme 4, the restaurant name (`h1`) has no width constraint or text wrapping, causing horizontal overflow when the name is long (e.g., "KAHRAMANMARAS").

## Fix
Two changes to `src/themes/theme-4/RestaurantHeader.tsx`:

1. **Line 65**: Add `truncate` or `min-w-0` + `break-words` to the `h1` to prevent overflow. Since `tracking-widest` + `uppercase` makes long names very wide, `truncate` is cleanest — it will ellipsis the name if too long.

2. **Line 55** (the parent flex container with `gap-3`): Add `min-w-0` and `overflow-hidden` so the flex child can shrink.

Specifically:
- Line 55: `<div className="flex items-center gap-3">` → `<div className="flex items-center gap-3 min-w-0 overflow-hidden">`
- Line 65: Add `truncate` class to the `h1` → `<h1 className="font-display text-lg font-bold tracking-widest text-foreground uppercase truncate">`

This ensures the name truncates with ellipsis rather than pushing the layout wider.

