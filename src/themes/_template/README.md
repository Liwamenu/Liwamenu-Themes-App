# Theme Template

Scaffold for new themes. **Do not import this directory directly** — it's not a runnable theme. Use the generator to produce a numbered theme:

```sh
node scripts/new-theme.mjs 7
```

That copies `_template/` → `theme-7/` and substitutes `__N__` with `7` everywhere. Then register it in `src/themes/ThemeRouter.tsx`:

```ts
const themeComponents = {
  ...
  6: lazy(() => import("./theme-7")),  // themeId 6 → theme-7
};
```

(Theme IDs are 0-indexed; `themeId` from the backend = directory number minus 1.)

## What to customize for each theme

| File | What to change |
|---|---|
| `theme.css` | Light + dark palette, font families, gradient stops |
| `index.tsx` | The description comment (one-line summary of the theme's vibe) |
| `ProductCard.tsx` | Card layout — image position, badges, price block |
| `CategoryTabs.tsx` | Tab look — pill/underline/chip, active-state styling |

Every other component (`CartDrawer`, `CheckoutModal`, `RestaurantHeader`, modals, etc.) styles itself from the CSS variables in `theme.css` — leave them alone unless the theme genuinely needs a different layout.

## Why placeholders

`__N__` is the theme number. It appears in:

- `theme.css` — `.theme-__N__` selectors and `theme__N__-*` keyframe names (must be unique per theme so animations don't collide when two theme stylesheets coexist on the same page)
- `MenuPage.tsx` — the wrapping `<div className="theme-__N__">` that scopes CSS variables to this theme's subtree
- `index.tsx` — the description comment

The generator script does a literal find/replace, so don't use `__N__` for anything other than the theme number.
