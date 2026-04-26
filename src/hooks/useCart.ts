import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, Portion, SelectedTagItem } from '@/types/restaurant';
import { useRestaurantStore } from '@/hooks/useRestaurant';
import { createTTLStorage, TWO_HOURS_MS, startTTLEvictionTimer } from '@/lib/persistTTL';

// Shared helper to get the correct display price for a portion.
// Campaign is gated by the product-level `isCampaign` flag.
// `null`/`undefined` means "not set" — `0` is a valid price value.
export function getPortionDisplayPrice(
  portion: Portion,
  isSpecialPriceActive: boolean,
  isCampaign?: boolean,
): number {
  if (isSpecialPriceActive && portion.specialPrice != null) {
    return portion.specialPrice;
  }
  if (isCampaign && portion.campaignPrice != null) {
    return portion.campaignPrice;
  }
  return portion.price;
}

export function getCartItemDisplayPrice(
  item: CartItem,
  isSpecialPriceActive: boolean,
): number {
  const liveProduct = useRestaurantStore
    .getState()
    .restaurantData.products.find((product) => product.id === item.product.id);
  const livePortion = liveProduct?.portions.find((portion) => portion.id === item.portion.id);

  return getPortionDisplayPrice(
    livePortion ?? item.portion,
    isSpecialPriceActive,
    liveProduct?.isCampaign ?? item.product.isCampaign,
  );
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, portion: Portion, selectedTags: SelectedTagItem[], quantity?: number, note?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

// Helper to compare selected tags
const areTagsEqual = (tags1: SelectedTagItem[], tags2: SelectedTagItem[]): boolean => {
  if (tags1.length !== tags2.length) return false;

  const sortedTags1 = [...tags1].sort((a, b) => `${a.tagId}-${a.itemId}`.localeCompare(`${b.tagId}-${b.itemId}`));
  const sortedTags2 = [...tags2].sort((a, b) => `${a.tagId}-${a.itemId}`.localeCompare(`${b.tagId}-${b.itemId}`));

  return sortedTags1.every((tag, index) =>
    tag.tagId === sortedTags2[index].tagId &&
    tag.itemId === sortedTags2[index].itemId &&
    tag.quantity === sortedTags2[index].quantity
  );
};

const STORAGE_KEY = 'restaurant-cart';

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, portion, selectedTags, quantity = 1, note) => {
        const items = get().items;

        const existingItemIndex = items.findIndex(item =>
          item.product.id === product.id &&
          item.portion.id === portion.id &&
          (item.note || '') === (note || '') &&
          areTagsEqual(item.selectedTags, selectedTags)
        );

        if (existingItemIndex !== -1) {
          set((state) => ({
            items: state.items.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }));
        } else {
          const id = `${product.id}-${portion.id}-${Date.now()}`;
          const newItem: CartItem = {
            id,
            product,
            portion,
            quantity,
            selectedTags,
            note,
          };
          set((state) => ({
            items: [...state.items, newItem],
          }));
        }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        // Don't allow quantity below 1 - deletion should only happen via removeItem
        if (quantity < 1) {
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        const items = get().items;
        const isSpecialPriceActive = useRestaurantStore.getState().restaurantData.isSpecialPriceActive;
        return items.reduce((total, item) => {
          const price = getCartItemDisplayPrice(item, isSpecialPriceActive);
          const tagTotal = item.selectedTags.reduce((sum, tag) => sum + (tag.price * tag.quantity), 0);
          return total + ((price + tagTotal) * item.quantity);
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createTTLStorage(TWO_HOURS_MS)),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Periodically evict expired cart and reset in-memory store
if (typeof window !== 'undefined') {
  startTTLEvictionTimer(STORAGE_KEY, TWO_HOURS_MS, 60_000, () => {
    useCart.setState({ items: [] });
  });
}
