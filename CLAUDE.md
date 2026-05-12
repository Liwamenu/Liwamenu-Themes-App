# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run preview    # Preview production build
```

Both `npm` and `bun` are available (lock files for both exist).

## Architecture

This is a **multi-tenant QR menu** app for restaurants (LiwaMenu). Customers scan a QR code at their table and get a themed, localized digital menu.

### Tenant Resolution

The app resolves which restaurant to load via `src/lib/api.ts`:
- Subdomain: `addis.liwamenu.com` → tenant `addis`
- Path: `localhost:8080/addis` → tenant `addis`
- Fallback: `demo1`

Backend API base: `https://liwamenu.pentegrasyon.net`. A `USE_DUMMY_DATA` flag in `api.ts` switches to local mock data for development.

### Theme System

26 themes (`src/themes/theme-1` through `theme-26`), each a complete set of UI components (MenuPage, ProductCard, CartDrawer, modals, etc.). The `ThemeRouter` (`src/themes/ThemeRouter.tsx`) lazy-loads the active theme based on `restaurantData.themeId` (0-indexed: `themeId` 0 → `theme-1`, `themeId` 25 → `theme-26`). Theme 1 is the default fallback when `themeId` is missing or unmapped.

To add a new theme: copy `src/themes/_template/` to `src/themes/theme-N/`, customize, then register it in the `themeComponents` map in `ThemeRouter.tsx` (keying by `themeId`, i.e. `N - 1`).

Theme 1 reuses shared components from `src/components/menu/`. Themes 2+ each have their own full component set plus a `theme.css`.

### State Management (Zustand)

All stores use Zustand `persist` middleware with a custom 2-hour TTL via `src/lib/persistTTL.ts`:
- `useRestaurantStore` (`src/hooks/useRestaurant.ts`) — restaurant data, table number, active menu
- `useCart` (`src/hooks/useCart.ts`) — cart items, price calculations
- `useOrder` (`src/hooks/useOrder.ts`) — order history and status tracking
- `useFirebaseMessagingStore` (`src/hooks/useFirebaseMessaging.ts`) — FCM tokens, push notification state

### i18n

11 languages (tr, en, de, fr, it, es, ar, az, ru, el, zh). Translation files in `src/locales/{lang}/translation.json`. Turkish is the fallback language. Arabic triggers RTL layout via document `dir` attribute. Configured in `src/lib/i18n.ts`.

### Firebase

Firebase Cloud Messaging for real-time order status push notifications. Service worker at `public/firebase-messaging-sw.js`. Audio alerts and text-to-speech announcements on order updates.

### Announcement System

`AnnouncementModal` renders backend-authored HTML inside a sandboxed iframe with `allow-scripts`. The HTML is trusted admin content — do not relax the trust boundary to accept user-generated HTML.

## Key Conventions

- **Path alias**: `@` maps to `./src` (configured in vite and tsconfig)
- **UI components**: shadcn/ui in `src/components/ui/` — add new ones via the shadcn CLI
- **Styling**: Tailwind CSS with HSL CSS variables for semantic color tokens. Dark mode via class attribute (next-themes)
- **Types**: Domain types in `src/types/restaurant.ts` (RestaurantData, Product, Portion, Order, CartItem, etc.)
- **TypeScript**: Loose strictness (`strictNullChecks: false`, `noImplicitAny: false`)
- **Unused vars**: ESLint rule `@typescript-eslint/no-unused-vars` is turned off
