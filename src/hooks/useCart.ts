import { create } from 'zustand';
import { CartItem, Product, Portion, SelectedTagItem } from '@/types/restaurant';

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

export const useCart = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (product, portion, selectedTags, quantity = 1, note) => {
    const items = get().items;
    
    // Find existing item with same product, portion, tags, and note
    const existingItemIndex = items.findIndex(item => 
      item.product.id === product.id &&
      item.portion.id === portion.id &&
      (item.note || '') === (note || '') &&
      areTagsEqual(item.selectedTags, selectedTags)
    );
    
    if (existingItemIndex !== -1) {
      // Merge: increase quantity of existing item
      set((state) => ({
        items: state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      }));
    } else {
      // Add as new item
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
    return items.reduce((total, item) => {
      // Get the best price for this portion
      const portion = item.portion;
      let price = portion.price;
      if (portion.specialPrice !== null) {
        price = portion.specialPrice;
      } else if (portion.campaignPrice !== null) {
        price = portion.campaignPrice;
      }
      
      // Add tag prices
      const tagTotal = item.selectedTags.reduce((sum, tag) => sum + (tag.price * tag.quantity), 0);
      
      return total + ((price + tagTotal) * item.quantity);
    }, 0);
  },
  
  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
