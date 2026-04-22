import { useMemo, useEffect } from 'react';
import { create } from 'zustand';
import { restaurantData as initialRestaurantData } from '@/data/restaurant';
import { RestaurantData, Product, WorkingHour } from '@/types/restaurant';
import { changeLanguage } from '@/lib/i18n';
import { USE_DUMMY_DATA, API_URLS, getTenant } from '@/lib/api';

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

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  restaurantData: initialRestaurantData.restaurantData,
  isLoading: !USE_DUMMY_DATA,
  error: null,
  isInitialized: USE_DUMMY_DATA,
  setRestaurantData: (data: RestaurantData) =>
    set({ restaurantData: data, isLoading: false, error: null, isInitialized: true }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error, isLoading: false }),
  setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
  setTableNumber: (tableNumber: string) =>
    set((state) => ({
      restaurantData: { ...state.restaurantData, tableNumber },
    })),
}));

// Call this once at app startup (in MenuPage)
export function useInitializeRestaurant() {
  const { isInitialized, setRestaurantData, setLoading, setError, isLoading, error } =
    useRestaurantStore();

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

          // Extract tableNumber from URL query params on first load
          const urlParams = new URLSearchParams(window.location.search);
          const tableParam = urlParams.get('tableNumber');
          if (tableParam && tableParam.trim()) {
            restaurantData.tableNumber = tableParam.trim();
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

  return { isLoading, error, isInitialized };
}

export function useRestaurant() {
  const { restaurantData: data, setTableNumber } = useRestaurantStore();

  const isRestaurantActive = useMemo(() => {
    return data.isActive && data.licenseIsActive && !data.hide;
  }, [data]);

  const getCurrentWorkingHour = useMemo((): WorkingHour | null => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    return data.workingHours.find(wh => wh.day === dayOfWeek) || null;
  }, [data]);

  const isCurrentlyOpen = useMemo(() => {
    const workingHour = getCurrentWorkingHour;
    if (!workingHour || workingHour.isClosed) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= workingHour.open && currentTime <= workingHour.close;
  }, [getCurrentWorkingHour]);

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
    const formatted = price.toFixed(2);
    if (data.moneySign) {
      return `${data.moneySign}${formatted}`;
    }
    return formatted;
  };

  const recommendedProducts = useMemo(() => {
    const all = data.products.filter(p => p.recommendation && !p.hide);
    if (allowedCategoryIds) {
      const filtered = all.filter(p => allowedCategoryIds.has(p.categoryId));
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }, [data, allowedCategoryIds]);

  const campaignProducts = useMemo(() => {
    const all = data.products.filter(p => !p.hide && p.portions.some(portion => (portion.campaignPrice ?? 0) > 0));
    if (allowedCategoryIds) {
      const filtered = all.filter(p => allowedCategoryIds.has(p.categoryId));
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }, [data, allowedCategoryIds]);

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
