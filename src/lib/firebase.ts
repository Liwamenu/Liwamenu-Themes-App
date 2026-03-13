import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCdz-noqvisJwszkQdrmA8LXLJ_FFE2jdY",
  authDomain: "liwamenu-dca55.firebaseapp.com",
  projectId: "liwamenu-dca55",
  storageBucket: "liwamenu-dca55.firebasestorage.app",
  messagingSenderId: "155320793490",
  appId: "1:155320793490:web:2d375db48cd7dee2dca94b",
};

const VAPID_KEY =
  "BI1qJ_oVpoZqvE10b1_8dd8mvdhbroqajMieGj71CXZrGiyKw5e1SNqnDNMK1nuKnKzFAlwvSUO2-xJ4akOQUyU";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase Cloud Messaging and request a push token.
 * Safe to call multiple times — idempotent.
 */
export async function initFirebaseMessaging(): Promise<{
  supported: boolean;
  token: string | null;
}> {
  console.log("[FCM] Starting init...");

  const supported = await isSupported();
  console.log("[FCM] isSupported:", supported);
  if (!supported) return { supported: false, token: null };

  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);

  // Register the service worker for background messages (force update)
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { updateViaCache: "none" });
    await reg.update();
    console.log("[FCM] Service worker registered & updated");
  } catch (err) {
    console.error("[FCM] SW registration failed:", err);
  }

  const permission = await Notification.requestPermission();
  console.log("[FCM] Permission result:", permission);
  if (permission !== "granted") {
    return { supported: true, token: null };
  }

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  console.log("[FCM] Token received:", token ? token.substring(0, 20) + "..." : "null");
  return { supported: true, token };
}

/**
 * Subscribe to foreground push messages.
 * Returns an unsubscribe function.
 */
export function subscribeForegroundMessages(
  onPayload: (payload: any) => void
): () => void {
  if (!messaging) return () => {};
  return onMessage(messaging, onPayload);
}
