import { create } from "zustand";
import { initFirebaseMessaging, subscribeForegroundMessages } from "@/lib/firebase";
import { useOrder } from "@/hooks/useOrder";
import { toast } from "sonner";
import type { Order } from "@/types/restaurant";

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

// Map FCM status strings to Order status type
const STATUS_MAP: Record<string, Order["status"]> = {
  // Backend enums
  Pending: "pending",
  Accepted: "confirmed",
  Preparing: "preparing",
  OnTheWay: "ready",
  Delivered: "delivered",
  Cancelled: "cancelled",
  // lowercase variants
  pending: "pending",
  accepted: "confirmed",
  preparing: "preparing",
  ontheway: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
};

// Play a notification sound
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Pleasant two-tone notification
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // console.warn("[FCM] Could not play notification sound:", e);
  }
}

function handleOrderStatusChange(msg: PushMessage) {
  const mappedStatus = STATUS_MAP[msg.status];
  if (!mappedStatus) {
    // console.warn("[FCM] Unknown order status:", msg.status);
    return;
  }

  // Update order in Zustand store
  useOrder.getState().updateOrderStatus(msg.orderId, mappedStatus);
  // console.log(`[FCM] Order ${msg.orderId} status → ${mappedStatus}`);

  // Play notification sound
  playNotificationSound();

  // Show toast with notification body
  toast.info(msg.title, { description: msg.body });

  // Text-to-speech announcement if sound permission granted
  if (localStorage.getItem("soundPermission") === "granted" && "speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(msg.body);
    utterance.lang = document.documentElement.lang || "en";
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Handle any incoming push message (foreground or relayed from SW).
 */
function handlePushPayload(payload: any, source: string) {
  // console.log(`[FCM] 🔔 ${source} payload:`, JSON.stringify(payload, null, 2));
  const msg = parsePayload(payload);
  // console.log(`[FCM] 🔔 Parsed message:`, JSON.stringify(msg, null, 2));
  useFirebaseMessagingStore.getState().addMessage(msg);

  if (msg.type === "order_status_changed" && msg.orderId && msg.orderId !== "-") {
    // console.log("[FCM] 🔄 Processing order status change:", msg.orderId, "→", msg.status);
    handleOrderStatusChange(msg);
  } else {
    // console.log("[FCM] ℹ️ Non-order message, type:", msg.type);
  }
}

/**
 * Initialize Firebase messaging once. Safe to call multiple times.
 * Call this early in the app lifecycle (e.g. ThemeRouter after data loads).
 */
export async function initializeFirebaseMessaging() {
  const store = useFirebaseMessagingStore.getState();
  if (store.isInitialized) {
    // console.log("[FCM] Already initialized, skipping");
    return;
  }

  // Listen for messages relayed from the service worker (background pushes)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FCM_BACKGROUND_MESSAGE") {
        // console.log("[FCM] 📬 Received SW relay message");
        handlePushPayload(event.data.payload, "SW-relay");
      }
    });
    // console.log("[FCM] SW message listener registered");
  }

  try {
    const { supported, token } = await initFirebaseMessaging();
    // console.log("[FCM] Init result — supported:", supported, "token:", token ? token.substring(0, 20) + "..." : "null");
    store.setSupported(supported);
    store.setPushToken(token);
    store.setInitialized(true);

    if (supported) {
      // console.log("[FCM] Subscribing to foreground messages...");
      subscribeForegroundMessages((payload: any) => {
        handlePushPayload(payload, "foreground");
      });
      // console.log("[FCM] Foreground subscription active");
    } else {
      // console.warn("[FCM] Not supported, skipping foreground subscription");
    }
  } catch (err) {
    // console.error("[FCM] Firebase messaging init failed:", err);
    store.setInitialized(true);
  }
}
