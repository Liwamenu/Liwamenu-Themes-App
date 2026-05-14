import { useMemo, useEffect } from 'react';
import { create } from 'zustand';
import { restaurantData as initialRestaurantData } from '@/data/restaurant';
import { RestaurantData, Product, WorkingHour } from '@/types/restaurant';
import { changeLanguage } from '@/lib/i18n';
import { USE_DUMMY_DATA, API_URLS, getTenant } from '@/lib/api';
import { TWO_HOURS_MS, startTTLEvictionTimer } from '@/lib/persistTTL';

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
    if (typeof savedAt !== 'number' || Date.now() - savedAt > TWO_HOURS_MS) {
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
  setRestaurantData: (data: RestaurantData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  setTableNumber: (tableNumber: string) => void;
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
    set((state) => ({
      restaurantData: { ...state.restaurantData, tableNumber },
    }));
  },
}));

// Call this once at app startup (in MenuPage)
export function useInitializeRestaurant() {
  const { isInitialized, setRestaurantData, setLoading, setError, isLoading, error, setTableNumber } =
    useRestaurantStore();

  // TTL eviction: clear persisted table after 2h and reflect in store
  useEffect(() => {
    const cleanup = startTTLEvictionTimer(
      tableStorageKey(),
      TWO_HOURS_MS,
      60_000,
      () => setTableNumber(''),
    );
    return cleanup;
  }, [setTableNumber]);

  useEffect(() => {
    if (USE_DUMMY_DATA || isInitialized) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const tenant = getTenant();
        const res = await fetch(`${API_URLS.getRestaurantFull}?tenant=${tenant}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const restaurantData = json.data?.restaurantData ?? json.restaurantData ?? json;

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
        const res = await fetch(`${API_URLS.getRestaurantFull}?tenant=${tenant}`);
        if (!res.ok) return;
        const json = await res.json();
        const fresh = json.data?.restaurantData ?? json.restaurantData ?? json;
        if (!fresh || !fresh.restaurantId) return;

        const current = useRestaurantStore.getState().restaurantData;

        // Equality check on the fields that actually drive UI:
        // - themeId (theme switch)
        // - hide / isActive / licenseIsActive / userIsActive (block screen)
        // - menuLang (language switch)
        // - product count (rough "menu changed" proxy)
        const themeChanged = fresh.themeId !== current.themeId;
        const visibilityChanged =
          fresh.hide !== current.hide ||
          fresh.isActive !== current.isActive ||
          fresh.licenseIsActive !== current.licenseIsActive ||
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
  const { restaurantData: data, setTableNumber } = useRestaurantStore();

  const isRestaurantActive = useMemo(() => {
    return (
      data.isActive &&
      data.licenseIsActive &&
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

  const activeMenu = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
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
  }, [data]);

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
    let visibleProducts = allVisible;

    if (allowedCategoryIds) {
      const filtered = allVisible.filter(p => allowedCategoryIds.has(p.categoryId));
      if (filtered.length > 0) {
        visibleProducts = filtered;
      }
    }

    const categoryMap = new Map<string, Category>();

    visibleProducts.forEach(product => {
      if (!categoryMap.has(product.categoryId)) {
        categoryMap.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryName,
          image: product.categoryImage,
          sortOrder: product.categorySortOrder,
          products: [],
        });
      }
      categoryMap.get(product.categoryId)!.products.push(product);
    });

    categoryMap.forEach(category => {
      category.products.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data, allowedCategoryIds]);

  const formatPrice = (price: number): string => {
    const decimals = data.decimalPoint ?? 2;
    const formatted = price.toFixed(decimals);
    if (data.moneySign) {
      return `${data.moneySign}${formatted}`;
    }
    return formatted;
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
    setTableNumber,
    formatPrice,
    activeMenu,
  };
}
