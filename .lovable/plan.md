

## Plan: Fetch Restaurant Data from API with Dummy Data Fallback

### Overview
Add a `GetRestaurantFullByTenant` API call to load restaurant data dynamically. A single toggle variable controls whether to use the API or the existing dummy data. The tenant is determined automatically: `"addis"` in local development, extracted from the URL in production.

### Changes

**1. `src/lib/api.ts`** -- Add the new endpoint and tenant resolver
- Add `getRestaurantFull` endpoint: `https://api.liwamenu.com/api/Restaurants/GetRestaurantFullByTenant`
- Add `USE_DUMMY_DATA` boolean constant (set to `true` by default for dev)
- Add `getTenant()` helper: returns `"addis"` if `localhost`, otherwise extracts tenant from the URL subdomain or path

**2. `src/hooks/useRestaurant.ts`** -- Add API fetching with loading/error states
- Expand the Zustand store with: `setRestaurantData`, `isLoading`, `error`, `isInitialized`
- Add a `useInitializeRestaurant()` hook that:
  - If `USE_DUMMY_DATA` is `true`: loads from `src/data/restaurant.ts` (current behavior)
  - If `false`: calls `GET /api/Restaurants/GetRestaurantFullByTenant?tenant={tenant}` on mount
  - Sets loading/error states accordingly
- Keep all existing `useRestaurant()` logic unchanged -- it continues reading from the Zustand store

**3. `src/components/menu/MenuPage.tsx`** -- Call the initializer and show loading state
- Call `useInitializeRestaurant()` at the top of `MenuPage`
- Show a loading spinner while `isLoading` is true
- Show an error state if the fetch fails

**4. `src/data/restaurant.ts`** -- No changes, kept as dummy/fallback data

### Tenant Resolution Logic
```text
localhost / 127.0.0.1  →  "addis"
liwamenu.com/addis     →  "addis"  (path-based)
addis.liwamenu.com     →  "addis"  (subdomain-based)
```

The `getTenant()` function will check the hostname first. If local, return `"addis"`. Otherwise, extract from the first path segment (e.g., `window.location.pathname.split('/')[1]`). This can be adjusted once you finalize your production URL structure.

### Summary of Files
| File | Action |
|------|--------|
| `src/lib/api.ts` | Add endpoint, `USE_DUMMY_DATA` flag, `getTenant()` |
| `src/hooks/useRestaurant.ts` | Add `setRestaurantData`, `useInitializeRestaurant()` |
| `src/components/menu/MenuPage.tsx` | Call initializer, loading/error UI |
| `src/data/restaurant.ts` | No changes |

