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

const isFresh = (order: Order, ttlMs: number): boolean => {
  const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : NaN;
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= ttlMs;
};

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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fresh = (state.orders || []).filter((o) => isFresh(o, TWO_HOURS_MS));
        const current = state.currentOrder && isFresh(state.currentOrder, TWO_HOURS_MS)
          ? state.currentOrder
          : null;
        if (fresh.length !== state.orders.length || current !== state.currentOrder) {
          useOrder.setState({ orders: fresh, currentOrder: current });
        }
      },
    }
  )
);

// Periodically evict expired persisted state and prune stale orders by their own createdAt
if (typeof window !== 'undefined') {
  startTTLEvictionTimer(STORAGE_KEY, TWO_HOURS_MS, 60_000, () => {
    useOrder.setState({ orders: [], currentOrder: null });
  });
  setInterval(() => {
    const { orders, currentOrder } = useOrder.getState();
    const fresh = orders.filter((o) => isFresh(o, TWO_HOURS_MS));
    const current = currentOrder && isFresh(currentOrder, TWO_HOURS_MS) ? currentOrder : null;
    if (fresh.length !== orders.length || current !== currentOrder) {
      useOrder.setState({ orders: fresh, currentOrder: current });
    }
  }, 60_000);
}
