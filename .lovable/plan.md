
# Theme 6: Warm Cream & Purple-Gold (Artisan Style)

Inspired by the uploaded reference (Cadinin Evi), this theme features a warm cream background, deep purple headings, gold accents, and serif-style display fonts -- giving it a boutique/artisan restaurant feel distinct from all existing themes.

## Visual Identity

- **Palette**: Warm cream (#f5efe4) background, deep purple (#3f2a56) headings, purple-violet (#7856FF) primary, bronze-gold (#b37c46) secondary accents
- **Fonts**: `Playfair Display` for headings (serif, elegant), `DM Sans` for body (clean sans-serif) -- a unique combo not used in any other theme
- **Card style**: Tall portrait product images (3:4 ratio) with rounded corners, cream card backgrounds, subtle warm shadows
- **Category banners**: Full-width cards with background image + purple gradient overlay and category name (inspired by the reference's category banner style)

## Unique Interaction Patterns (same page structure, new opening styles)

- **Product Detail Modal**: Slides up from bottom as a "sheet" style with a spring animation and draggable close handle (vs. the centered modal in other themes)
- **Cart Drawer**: Opens from the left side (other themes use right) with a curtain-reveal animation
- **Category Tabs**: Pill-shaped tabs with an animated underline that morphs between selections using `layoutId`
- **Product Cards**: Horizontal layout with tall portrait image on the left (3:4 ratio), info on the right -- matching the reference's product list style
- **Hover/tap**: Cards lift with a warm glow shadow on hover

## Files to Create (under `src/themes/theme-6/`)

| File | Type | Description |
|------|------|-------------|
| `index.tsx` | Custom | Theme entry, imports theme.css |
| `theme.css` | Custom | Full color palette (light+dark), fonts, animations, shadows |
| `MenuPage.tsx` | Custom | Same structure as other themes but uses theme-6 class, left-side cart, bottom-sheet product detail |
| `RestaurantHeader.tsx` | Custom | Warm header with serif logo display, gradient background inspired by reference |
| `CategoryTabs.tsx` | Custom | Pill tabs with `layoutId` animated indicator |
| `ProductCard.tsx` | Custom | Horizontal card with tall portrait image (3:4) |
| `Footer.tsx` | Custom | Warm-toned footer matching theme palette |
| `CartDrawer.tsx` | Re-export | `export { CartDrawer, CartButton } from "@/components/menu/CartDrawer"` (left-side handled via CSS transform) |
| All other modals | Re-export | CheckoutModal, OrderReceipt, ReservationModal, SurveyModal, CallWaiterModal, ChangeTableModal, AnnouncementModal, SoundPermissionModal, FlyingEmoji, WaiterSuccessAnimation, LanguageSwitcher, ThemeSwitcher, ProductDetailModal |

## Registration

- Add entry `5: lazy(() => import("./theme-6"))` to `ThemeRouter.tsx` (themeId 5 maps to theme-6 folder)

## What stays the same

- Same single-page architecture: menu view + order receipt view (no extra pages)
- All shared modals (checkout, order receipt, reservation, survey, etc.) re-exported from `@/components/menu/`
- Same data flow, cart logic, waiter call, scroll sync, search
- Product detail shown as modal (just different animation style)

## Technical Details

- ~6 custom files + ~14 re-export one-liners + 1 CSS file
- CSS scoped under `.theme-6` class, no global leaks
- Fonts loaded via Google Fonts `@import` in theme.css
- All color tokens follow the existing HSL format used by shadcn/ui
