import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order } from '@/types/restaurant';
import { createTTLStorage, TWO_HOURS_MS, startTTLEvictionTimer } from '@/lib/persistTTL';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  setCurrentOrder: (order: Order | null) => void;
  getOrders: () => Order[];
}

const STORAGE_KEY = 'restaurant-orders';

export const useOrder = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,

      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
          currentOrder: order,
        }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
          currentOrder: state.currentOrder?.id === orderId
            ? { ...state.currentOrder, status }
            : state.currentOrder,
        }));
      },

      setCurrentOrder: (order) => {
        set({ currentOrder: order });
      },

      getOrders: () => get().orders,
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createTTLStorage(TWO_HOURS_MS)),
    }
  )
);

// Periodically evict expired persisted state and reset in-memory store
if (typeof window !== 'undefined') {
  startTTLEvictionTimer(STORAGE_KEY, TWO_HOURS_MS, 60_000, () => {
    useOrder.setState({ orders: [], currentOrder: null });
  });
}
