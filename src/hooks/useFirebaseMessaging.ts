import { create } from "zustand";
import { initFirebaseMessaging, subscribeForegroundMessages } from "@/lib/firebase";

export interface PushMessage {
  at: string;
  type: string;
  orderId: string;
  reservationId: string;
  restaurantId: string;
  tableNumber: string;
  status: string;
  title: string;
  body: string;
}

interface FirebaseMessagingState {
  pushToken: string | null;
  isSupported: boolean;
  isInitialized: boolean;
  messages: PushMessage[];
  addMessage: (msg: PushMessage) => void;
  setPushToken: (token: string | null) => void;
  setSupported: (supported: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useFirebaseMessagingStore = create<FirebaseMessagingState>((set) => ({
  pushToken: null,
  isSupported: false,
  isInitialized: false,
  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [msg, ...state.messages].slice(0, 100) })),
  setPushToken: (token) => set({ pushToken: token }),
  setSupported: (supported) => set({ isSupported: supported }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));

function parsePayload(payload: any): PushMessage {
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  return {
    at: new Date().toLocaleTimeString(),
    type: data.type || "push",
    orderId: data.orderId || "-",
    reservationId: data.reservationId || "-",
    restaurantId: data.restaurantId || "-",
    tableNumber: data.tableNumber || "-",
    status: data.status || "-",
    title: notification.title || data.title || "Push",
    body: notification.body || data.body || JSON.stringify(data),
  };
}

/**
 * Initialize Firebase messaging once. Safe to call multiple times.
 * Call this early in the app lifecycle (e.g. ThemeRouter after data loads).
 */
export async function initializeFirebaseMessaging() {
  const store = useFirebaseMessagingStore.getState();
  if (store.isInitialized) return;

  try {
    const { supported, token } = await initFirebaseMessaging();
    store.setSupported(supported);
    store.setPushToken(token);
    store.setInitialized(true);

    if (supported) {
      subscribeForegroundMessages((payload: any) => {
        const msg = parsePayload(payload);
        store.addMessage(msg);
        console.log("[FCM] Foreground message:", msg);
      });
    }
  } catch (err) {
    console.warn("Firebase messaging init failed:", err);
    store.setInitialized(true);
  }
}
