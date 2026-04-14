

## Problem
After placing an order, switching to the Order Receipt view does not scroll the page to the top. The user sees the bottom of the receipt (or a non-scrollable state) because:
1. The scroll position remains wherever it was during checkout
2. The `overflow: hidden` from the body scroll lock (used during checkout modal) may not be fully cleared before the receipt renders

## Fix

**All theme MenuPage files** (theme-2, theme-3, theme-4, theme-5, and base `src/components/menu/MenuPage.tsx`):

Add `window.scrollTo(0, 0)` in the `handleOrderComplete` and `handleViewOrder` callbacks so the page scrolls to the top when transitioning to the receipt view.

For example in Theme 3 (`src/themes/theme-3/MenuPage.tsx` line 134):
```tsx
// Before
const handleOrderComplete = useCallback((order: Order) => { 
  setIsCheckoutOpen(false); setViewingOrder(order); setCurrentView("order"); 
}, []);

// After
const handleOrderComplete = useCallback((order: Order) => { 
  setIsCheckoutOpen(false); setViewingOrder(order); setCurrentView("order"); 
  window.scrollTo(0, 0); 
}, []);
```

Same for `handleViewOrder`:
```tsx
// Before
const handleViewOrder = useCallback((order: Order) => { 
  setViewingOrder(order); setCurrentView("order"); 
}, []);

// After  
const handleViewOrder = useCallback((order: Order) => { 
  setViewingOrder(order); setCurrentView("order"); 
  window.scrollTo(0, 0); 
}, []);
```

Also add `window.scrollTo(0, 0)` to `handleBackToMenu` so returning to the menu starts from the top:
```tsx
const handleBackToMenu = useCallback(() => { 
  setCurrentView("menu"); setViewingOrder(null); 
  window.scrollTo(0, 0); 
}, []);
```

Apply these three changes to all 5 MenuPage files:
- `src/components/menu/MenuPage.tsx`
- `src/themes/theme-2/MenuPage.tsx`
- `src/themes/theme-3/MenuPage.tsx`
- `src/themes/theme-4/MenuPage.tsx`
- `src/themes/theme-5/MenuPage.tsx`

