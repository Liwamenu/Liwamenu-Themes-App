import { useMemo, useEffect } from 'react';
import { create } from 'zustand';
import { restaurantData as initialRestaurantData } from '@/data/restaurant';
import { RestaurantData, Product, ProductCategoryRef, WorkingHour } from '@/types/restaurant';
import { changeLanguage } from '@/lib/i18n';
import { USE_DUMMY_DATA, API_URLS, getTenant } from '@/lib/api';
import { jsDayToPlanDay } from '@/lib/priceList';
import { THREE_HOURS_MS, startTTLEvictionTimer } from '@/lib/persistTTL';

const tableStorageKey = (): string => {
  try {
    return `restaurant-table-${getTenant()}`;
  } catch {
    return `restaurant-table-default`;
  }
};

function readPersistedTable(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(tableStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAt: number | undefined = parsed?.__savedAt;
    if (typeof savedAt !== 'number' || Date.now() - savedAt > THREE_HOURS_MS) {
      localStorage.removeItem(tableStorageKey());
      return null;
    }
    const value = typeof parsed?.value === 'string' ? parsed.value.trim() : '';
    return value || null;
  } catch {
    return null;
  }
}

function writePersistedTable(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      localStorage.removeItem(tableStorageKey());
      return;
    }
    localStorage.setItem(
      tableStorageKey(),
      JSON.stringify({ value: trimmed, __savedAt: Date.now() }),
    );
  } catch {
    /* noop */
  }
}

export interface Category {
  id: string;
  name: string;
  image: string;
  sortOrder: number;
  products: Product[];
}

interface RestaurantStore {
  restaurantData: RestaurantData;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  /** Monotonic counter bumped every 60 s to force time-dependent
   *  useMemos (activeMenu, prices) to re-evaluate. */
  menuTick: number;
  setRestaurantData: (data: RestaurantData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  setTableNumber: (tableNumber: string) => void;
  bumpMenuTick: () => void;
}

function getInitialRestaurantData(): RestaurantData {
  const base = initialRestaurantData.restaurantData;
  try {
    const persisted = readPersistedTable();
    return persisted ? { ...base, tableNumber: persisted } : base;
  } catch {
    return base;
  }
}

/**
 * Normalize API response to the shape the rest of the app expects.
 *
 * The backend has migrated `categoryId`/`categoryName`/etc. from top-level
 * product fields into a nested `categories[]` array. The frontend (types,
 * grouping helpers, 26 theme components) still reads the flat fields, so
 * we flatten the first category back to top-level on ingestion. The
 * `categories` array is preserved untouched in case future code wants it.
 */
function normalizeRestaurantData(raw: any): any {
  if (!raw || !Array.isArray(raw.products)) return raw;
  raw.products = raw.products.map((p: any) => {
    // Already in old shape: don't overwrite
    if (p.categoryId) return p;
    const first = Array.isArray(p.categories) ? p.categories[0] : null;
    if (!first) return p;
    return {
      ...p,
      categoryId: first.categoryId ?? "",
      categoryName: first.categoryName ?? "",
      categoryImage: first.categoryImage ?? "",
      categorySortOrder: first.categorySortOrder ?? 0,
      subCategoryId: first.subCategoryId ?? null,
      subCategoryName: first.subCategoryName ?? null,
      subCategoryImage: first.subCategoryImage ?? null,
      subCategorySortOrder: first.subCategorySortOrder ?? null,
      sortOrder: first.sortOrder ?? 0,
    };
  });
  return raw;
}

/**
 * Force a fresh fetch of restaurant data and update the store. Unlike
 * the silent refetch in `useInitializeRestaurant`, this always writes
 * to the store (even if nothing seemed to change) and is callable
 * imperatively. Used by the checkout flow after a 409 PRICE_MISMATCH
 * so the cart re-quotes prices against the latest menu before retry.
 *
 * Returns true on success, false on any error (caller decides UX).
 */
export async function refreshRestaurantData(): Promise<boolean> {
  if (USE_DUMMY_DATA) return true;
  try {
    const tenant = getTenant();
    // `no-store` bypasses both browser and intermediate caches. Without it
    // the browser may serve a stale response on repeated reloads, so the
    // customer keeps seeing outdated tag-option IDs and gets the same 400
    // "items not found" after refreshing the page. The endpoint is small
    // and tenant-scoped — no measurable cost to re-fetch every time.
    const res = await fetch(`${API_URLS.getRestaurantFull}?tenant=${tenant}`, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json();
    const fresh = normalizeRestaurantData(
      json.data?.restaurantData ?? json.restaurantData ?? json,
    );
    if (!fresh || !fresh.restaurantId) return false;
    // Preserve the user's table selection across refresh
    const current = useRestaurantStore.getState().restaurantData;
    fresh.tableNumber = current.tableNumber;
    useRestaurantStore.getState().setRestaurantData(fresh);
    return true;
  } catch {
    return false;
  }
}

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  restaurantData: getInitialRestaurantData(),
  isLoading: !USE_DUMMY_DATA,
  error: null,
  isInitialized: USE_DUMMY_DATA,
  setRestaurantData: (data: RestaurantData) =>
    set({ restaurantData: data, isLoading: false, error: null, isInitialized: true }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error, isLoading: false }),
  setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
  setTableNumber: (tableNumber: string) => {
    writePersistedTable(tableNumber);
    // Also sync the URL so a later page reload / silent refetch reads
    // the new table back instead of resurrecting the original QR-coded
    // value. Without this the init path would parse `?tableNumber=<old>`
    // off the URL and overwrite the persisted choice, so every operation
    // after a ChangeTableModal swap kept reverting to the first table.
    // history.replaceState keeps the change out of the browser back stack
    // (so the back button still goes wherever the customer came from).
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (tableNumber.trim()) {
          url.searchParams.set('tableNumber', tableNumber.trim());
        } else {
          url.searchParams.delete('tableNumber');
        }
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* malformed URL — ignore, the persisted value still wins */
      }
    }
    set((state) => ({
      restaurantData: { ...state.restaurantData, tableNumber },
    }));
  },
  menuTick: 0,
  bumpMenuTick: () => set((state) => ({ menuTick: state.menuTick + 1 })),
}));

// Call this once at app startup (in MenuPage)
export function useInitializeRestaurant() {
  const { isInitialized, setRestaurantData, setLoading, setError, isLoading, error, setTableNumber, bumpMenuTick } =
    useRestaurantStore();

  // TTL eviction: clear persisted table after 3h and reflect in store
  useEffect(() => {
    const cleanup = startTTLEvictionTimer(
      tableStorageKey(),
      THREE_HOURS_MS,
      60_000,
      () => setTableNumber(''),
    );
    return cleanup;
  }, [setTableNumber]);

  // Menu time-window ticker: bumps menuTick every 60 s so activeMenu
  // and all price-dependent useMemos re-evaluate. This is what makes
  // Happy-Hour prices revert to normal once the menu window ends.
  useEffect(() => {
    const id = setInterval(bumpMenuTick, 60_000);
    return () => clearInterval(id);
  }, [bumpMenuTick]);

  useEffect(() => {
    if (USE_DUMMY_DATA || isInitialized) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const tenant = getTenant();
        const res = await fetch(`${API_URLS.getRestaurantFull}?tenant=${tenant}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const restaurantData = normalizeRestaurantData(
            json.data?.restaurantData ?? json.restaurantData ?? json,
          );

          // Validate that we got meaningful data back (invalid tenant returns empty/null)
          if (!restaurantData || !restaurantData.restaurantId) {
            throw new Error('INVALID_TENANT');
          }

          // Priority: URL param > persisted localStorage > backend value
          const urlParams = new URLSearchParams(window.location.search);
          const themeParam = urlParams.get('theme');
          if (themeParam !== null) {
            const parsed = Number.parseInt(themeParam, 10);
            if (Number.isInteger(parsed)) restaurantData.themeId = parsed;
          }
          const tableParam = urlParams.get('tableNumber');
          if (tableParam && tableParam.trim()) {
            restaurantData.tableNumber = tableParam.trim();
            writePersistedTable(tableParam.trim());
          } else {
            const persisted = readPersistedTable();
            if (persisted) {
              restaurantData.tableNumber = persisted;
            }
          }

          setRestaurantData(restaurantData);

          // Set default language from restaurant's menuLang
          if (restaurantData.menuLang) {
            changeLanguage(restaurantData.menuLang.toLowerCase());
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to fetch restaurant data:', err);
          setError(err.message || 'Failed to load restaurant data');
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /**
   * Silent background refetch:
   * Re-fetches restaurant data when the tab becomes visible or window
   * regains focus, then writes to the store ONLY if something the user
   * cares about (theme, hide flag, active state) has changed. The fetch
   * runs without toggling `setLoading`, so there is no UI flicker. When
   * `themeId` differs the ThemeRouter swaps to the new lazy bundle
   * automatically — no hard reload needed. If nothing meaningful
   * changed, we don't call `setRestaurantData` at all, so no React
   * re-render is triggered.
   */
  useEffect(() => {
    if (USE_DUMMY_DATA) return;

    let inFlight = false;

    async function refetchSilent() {
      if (inFlight || !useRestaurantStore.getState().isInitialized) return;
      // URL ?theme= override always wins, never poll over it
      const urlTheme = new URLSearchParams(window.location.search).get("theme");
      if (urlTheme !== null) return;

      inFlight = true;
      try {
        const tenant = getTenant();
        const res = await fetch(`${API_URLS.getRestaurantFull}?tenant=${tenant}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const fresh = normalizeRestaurantData(
          json.data?.restaurantData ?? json.restaurantData ?? json,
        );
        if (!fresh || !fresh.restaurantId) return;

        const current = useRestaurantStore.getState().restaurantData;

        // Equality check on the fields that actually drive UI:
        // - themeId (theme switch)
        // - hide / isActive / qrLicenseIsActive / userIsActive (block screen)
        // - menuLang (language switch)
        // - product count (rough "menu changed" proxy)
        const themeChanged = fresh.themeId !== current.themeId;
        const visibilityChanged =
          fresh.hide !== current.hide ||
          fresh.isActive !== current.isActive ||
          fresh.qrLicenseIsActive !== current.qrLicenseIsActive ||
          fresh.userIsActive !== current.userIsActive;
        const menuLangChanged = fresh.menuLang !== current.menuLang;
        const productCountChanged =
          (fresh.products?.length ?? 0) !== (current.products?.length ?? 0);

        if (!themeChanged && !visibilityChanged && !menuLangChanged && !productCountChanged) {
          // Nothing the user cares about changed — skip the setState entirely
          // so no subscribed component re-renders.
          return;
        }

        // Preserve the user's table selection across refetches
        fresh.tableNumber = current.tableNumber;
        useRestaurantStore.getState().setRestaurantData(fresh);

        if (menuLangChanged && fresh.menuLang) {
          changeLanguage(fresh.menuLang.toLowerCase());
        }
      } catch {
        /* swallow — silent refetch must not surface errors */
      } finally {
        inFlight = false;
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchSilent();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refetchSilent);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refetchSilent);
    };
  }, []);

  return { isLoading, error, isInitialized };
}

export function useRestaurant() {
  const { restaurantData: data, setTableNumber, menuTick } = useRestaurantStore();

  const isRestaurantActive = useMemo(() => {
    return (
      data.isActive &&
      data.qrLicenseIsActive &&
      data.userIsActive !== false &&
      !data.hide
    );
  }, [data]);

  const getCurrentWorkingHour = useMemo((): WorkingHour | null => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    return data.workingHours.find(wh => wh.day === dayOfWeek) || null;
  }, [data]);

  const isCurrentlyOpen = useMemo(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayDow = now.getDay() === 0 ? 7 : now.getDay();
    const yesterdayDow = todayDow === 1 ? 7 : todayDow - 1;

    // Case 1: today's working hour
    const today = data.workingHours.find(wh => wh.day === todayDow);
    if (today && !today.isClosed) {
      const isOvernight = today.close < today.open;
      if (isOvernight) {
        // e.g. 16:00 - 02:00: open if currentTime >= open (evening side)
        if (currentTime >= today.open) return true;
      } else {
        if (currentTime >= today.open && currentTime <= today.close) return true;
      }
    }

    // Case 2: yesterday's overnight session spilling into today's early morning
    const yesterday = data.workingHours.find(wh => wh.day === yesterdayDow);
    if (yesterday && !yesterday.isClosed) {
      const isOvernight = yesterday.close < yesterday.open;
      if (isOvernight && currentTime <= yesterday.close) return true;
    }

    return false;
  }, [data, getCurrentWorkingHour]);

  // menuTick in deps forces periodic re-evaluation (every 60 s) so
  // activeMenu flips to null once the time window expires and prices
  // revert from Happy-Hour back to normal automatically.
  const activeMenu = useMemo(() => {
    const now = new Date();
    // Backend stores plan.days as Monday-first 0-indexed (Mon=0..Sun=6).
    // JS Date.getDay() is Sunday-first (Sun=0..Sat=6) — convert via the
    // shared helper so both code paths agree.
    const dayOfWeek = jsDayToPlanDay(now.getDay());
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const menu of data.menus) {
      for (const plan of menu.plans) {
        if (plan.days.includes(dayOfWeek)) {
          if (currentTime >= plan.startTime && currentTime <= plan.endTime) {
            return menu;
          }
        }
      }
    }
    return null;
  }, [data, menuTick]);

  const allowedCategoryIds = useMemo(() => {
    if (!activeMenu) return null;
    return new Set(activeMenu.categoryIds);
  }, [activeMenu]);

  const categories = useMemo((): Category[] => {
    // Backend now strips hidden products + products under inactive
    // categories/subcategories server-side (GetRestaurantFullByTenant
    // applies `!hide AND isActive AND category.isActive AND
    // (subCategory IS NULL OR subCategory.isActive)`), so anything
    // here is already meant to be visible. We still keep the `!p.hide`
    // belt-and-braces guard in case a legacy endpoint or staging
    // tenant leaks a hidden row.
    const allVisible = data.products.filter(p => !p.hide);

    // Each product may belong to MULTIPLE categories (new API shape).
    // Build a list of every (product, category-placement) pair so the
    // product appears once under EACH of its categories. Older flat
    // payloads fall back to a single placement built from the legacy
    // top-level categoryId / subCategoryId fields.
    const placements = (p: Product): ProductCategoryRef[] => {
      if (Array.isArray(p.categories) && p.categories.length > 0) return p.categories;
      // Legacy flat shape — wrap in a single-element array
      return [{
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        categoryImage: p.categoryImage,
        categorySortOrder: p.categorySortOrder,
        subCategoryId: p.subCategoryId,
        subCategoryName: p.subCategoryName,
        subCategoryImage: p.subCategoryImage,
        subCategorySortOrder: p.subCategorySortOrder,
        sortOrder: p.sortOrder,
      }];
    };

    // Filter by active menu's allowed categories: keep a product if
    // ANY of its placements falls inside the allowed set. If the
    // menu's categoryIds match NO product (e.g. stale/empty menu
    // config), fall back to showing every product under its actual
    // categories — mirrors the legacy behavior.
    let visibleProducts = allVisible;
    let enforceAllowedFilter = !!allowedCategoryIds;
    if (allowedCategoryIds) {
      const filtered = allVisible.filter(p =>
        placements(p).some(c => allowedCategoryIds.has(c.categoryId)),
      );
      if (filtered.length > 0) {
        visibleProducts = filtered;
      } else {
        // No product matches the menu's allowed list — disable the
        // per-placement filter below so we still render something.
        enforceAllowedFilter = false;
      }
    }

    const categoryMap = new Map<string, Category>();

    visibleProducts.forEach(product => {
      for (const c of placements(product)) {
        // If the active menu restricts categories, skip placements
        // outside that set (a product can still appear in other allowed
        // categories from the same placements array).
        if (enforceAllowedFilter && !allowedCategoryIds!.has(c.categoryId)) continue;

        if (!categoryMap.has(c.categoryId)) {
          categoryMap.set(c.categoryId, {
            id: c.categoryId,
            name: c.categoryName,
            image: c.categoryImage,
            sortOrder: c.categorySortOrder,
            products: [],
          });
        }

        // "Shadow" product: clone with this placement's category +
        // subcategory fields overlaid so groupBySubcategory and
        // per-category sort use the right values for THIS section.
        const shadow: Product = {
          ...product,
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categoryImage: c.categoryImage,
          categorySortOrder: c.categorySortOrder,
          subCategoryId: c.subCategoryId,
          subCategoryName: c.subCategoryName,
          subCategoryImage: c.subCategoryImage,
          subCategorySortOrder: c.subCategorySortOrder ?? 0,
          sortOrder: c.sortOrder,
        };
        categoryMap.get(c.categoryId)!.products.push(shadow);
      }
    });

    categoryMap.forEach(category => {
      category.products.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data, allowedCategoryIds]);

  const formatPrice = (price: number): string => {
    const decimals = data.decimalPoint ?? 2;
    // Map currency symbol to a locale so Intl.NumberFormat uses the right
    // thousands/decimal separators (e.g. ₺ → tr-TR gives "5.000,00").
    const localeMap: Record<string, string> = {
      "₺": "tr-TR", "€": "de-DE", "$": "en-US", "£": "en-GB",
      "₽": "ru-RU", "¥": "ja-JP", "₪": "he-IL", "₴": "uk-UA",
    };
    const locale = localeMap[data.moneySign ?? ""] ?? "tr-TR";
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(price);
    if (data.moneySign) {
      return `${data.moneySign}${formatted}`;
    }
    return formatted;
  };

  /**
   * Like formatPrice but prefixes a leading +/- so order-tag deltas
   * read naturally. Use this for tag option labels and surcharge /
   * discount line items (e.g. "Salata Yok" priced at -25 should show
   * as "-₺25.00", NOT "+₺-25.00"). Zero values fall back to plain
   * formatPrice (callers usually skip these via shouldShowTagItemPrice).
   */
  const formatPriceWithSign = (price: number): string => {
    if (price === 0) return formatPrice(price);
    const sign = price > 0 ? "+" : "-";
    return `${sign}${formatPrice(Math.abs(price))}`;
  };

  const recommendedProducts = useMemo(() => {
    // Same cross-menu semantics as `campaignProducts` below: the
    // recommended carousel is a virtual aggregated view, not bound to
    // the active menu's category list. Restaurants flag individual
    // products as "Chef recommends" and expect them to surface no
    // matter which menu is currently active.
    return data.products.filter(p => p.recommendation && !p.hide);
  }, [data]);

  const campaignProducts = useMemo(() => {
    // A product is shown as a campaign ONLY when at least one of its
    // portions has a campaign price that is BOTH:
    //   (a) strictly greater than 0  → discards null / 0 / negative
    //       values the admin panel may save when the field is cleared
    //       or mistyped, and
    //   (b) strictly less than the portion's normal price  → discards
    //       "campaigns" where the admin entered a value >= the base,
    //       which isn't actually a discount and confuses users.
    //
    // Without this guard the carousel and per-card badge surfaced
    // bogus campaigns (e.g. portion with campaignPrice=0 looked free
    // while the real sale price was 0₺).
    //
    // NOTE: we intentionally do NOT apply the `allowedCategoryIds`
    // (active menu) filter here. "Kampanyalı Ürünler" is a virtual
    // cross-category tab — restaurants commonly put campaign items in
    // a dedicated "Kampanyalar" pseudo-category that isn't assigned to
    // any menu's categoryIds list, so menu-scoped filtering would
    // hide those exact products the user clicked the campaign tab to
    // see. Aggregate every valid campaign product regardless of menu.
    return data.products.filter(
      p =>
        !p.hide &&
        p.isCampaign &&
        p.portions.some(
          portion =>
            portion.campaignPrice != null &&
            portion.campaignPrice > 0 &&
            portion.campaignPrice < portion.price,
        ),
    );
  }, [data]);

  const enabledPaymentMethods = useMemo(() => {
    return data.paymentMethods.filter(pm => pm.enabled);
  }, [data]);

  const canOrderOnline = data.onlineOrder && isRestaurantActive && isCurrentlyOpen;
  const canOrderInPerson = data.inPersonOrder && isRestaurantActive && isCurrentlyOpen;
  // WhatsApp ordering — gated by the dedicated feature flag (and a phone
  // number). The backend now ships `whatsappOrder` / `whatsappOrderPhone`
  // on the restaurant projection, so the temporary "always-on alongside
  // paket" alias is gone. Restaurants that don't opt in won't see the
  // option.
  const canOrderWhatsapp =
    !!data.whatsappOrder &&
    !!(data.whatsappOrderPhone && data.whatsappOrderPhone.trim()) &&
    isRestaurantActive &&
    isCurrentlyOpen;

  return {
    restaurant: data,
    isRestaurantActive,
    isCurrentlyOpen,
    getCurrentWorkingHour,
    categories,
    recommendedProducts,
    campaignProducts,
    enabledPaymentMethods,
    canOrderOnline,
    canOrderInPerson,
    canOrderWhatsapp,
    setTableNumber,
    formatPrice,
    formatPriceWithSign,
    activeMenu,
  };
}
