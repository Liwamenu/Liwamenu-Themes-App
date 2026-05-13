import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";

// Configured via VITE_FIREBASE_* in .env / .env.local. When updating, also
// mirror changes into public/firebase-messaging-sw.js — service workers can't
// read Vite env vars at runtime.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export async function initFirebaseMessaging(): Promise<{
  supported: boolean;
  token: string | null;
}> {
  const supported = await isSupported();
  if (!supported) return { supported: false, token: null };

  if (!app) app = initializeApp(firebaseConfig);
  if (!messaging) messaging = getMessaging(app);

  await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { supported: true, token: null };
  }

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  return { supported: true, token };
}

export function subscribeForegroundMessages(
  onPayload: (payload: any) => void
): () => void {
  if (!messaging) return () => {};
  return onMessage(messaging, onPayload);
}
