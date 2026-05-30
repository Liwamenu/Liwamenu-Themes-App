import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, Portion, SelectedTagItem, OrderTagItem } from '@/types/restaurant';
import { useRestaurantStore } from '@/hooks/useRestaurant';
import { createTTLStorage, THREE_HOURS_MS, startTTLEvictionTimer } from '@/lib/persistTTL';
import { resolveActiveBasePrice } from '@/lib/priceList';

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
  // Same validity rule as the campaign filter in useRestaurant:
  // a campaign price only takes effect if it's strictly > 0 AND
  // strictly less than the base price. Otherwise fall through to the
  // normal price so the cart never undercharges (or charges 0) on a
  // misconfigured campaign entry.
  if (
    isCampaign &&
    portion.campaignPrice != null &&
    portion.campaignPrice > 0 &&
    portion.campaignPrice < portion.price
  ) {
    return portion.campaignPrice;
  }
  // Non-special, non-campaign → BASE price dictated by the active
  // menu's `priceListType` ("Happy Hour" pricing). Falls back to the
  // normal `portion.price` when no menu is active or the selected
  // price column is empty, so the cart stays correct & backward
  // compatible.
  return resolveActiveBasePrice(portion);
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
  removeItems: (itemIds: string[]) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  /**
   * Re-sync every cart item's stored snapshot (portion + selected tag
   * prices) from the LIVE restaurant store. Call this after a backend
   * 409 PRICE_MISMATCH so the next order submission quotes the current
   * menu prices.
   *
   * The portion display price is already read live via
   * `getCartItemDisplayPrice`, but `item.portion` and `selectedTags[].price`
   * are stored snapshots — those are what we refresh here.
   */
  syncPricesFromLiveMenu: () => void;
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

      removeItems: (itemIds) => {
        const ids = new Set(itemIds);
        set((state) => ({
          items: state.items.filter((item) => !ids.has(item.id)),
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

      syncPricesFromLiveMenu: () => {
        const liveProducts = useRestaurantStore.getState().restaurantData.products;
        set((state) => ({
          items: state.items.map((item) => {
            const liveProduct = liveProducts.find((p) => p.id === item.product.id);
            if (!liveProduct) return item;
            const livePortion = liveProduct.portions.find(
              (p) => p.id === item.portion.id,
            );
            // Flatten every tag option on the live portion so we can
            // look up the customer's selected options by itemId.
            const liveTagOptionsById = new Map<string, OrderTagItem>();
            (livePortion?.orderTags || []).forEach((tag) => {
              (tag.orderTagItems || []).forEach((opt) => {
                liveTagOptionsById.set(opt.id, opt);
              });
            });
            const refreshedTags = item.selectedTags.map((st) => {
              const liveOpt = liveTagOptionsById.get(st.itemId);
              return liveOpt ? { ...st, price: liveOpt.price } : st;
            });
            return {
              ...item,
              product: liveProduct,
              portion: livePortion ?? item.portion,
              selectedTags: refreshedTags,
            };
          }),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createTTLStorage(THREE_HOURS_MS)),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Periodically evict expired cart and reset in-memory store
if (typeof window !== 'undefined') {
  startTTLEvictionTimer(STORAGE_KEY, THREE_HOURS_MS, 60_000, () => {
    useCart.setState({ items: [] });
  });
}
