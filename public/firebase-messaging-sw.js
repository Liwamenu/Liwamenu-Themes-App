/* eslint-disable no-undef */
// SW Version: 2 — force update
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCdz-noqvisJwszkQdrmA8LXLJ_FFE2jdY",
  authDomain: "liwamenu-dca55.firebaseapp.com",
  projectId: "liwamenu-dca55",
  storageBucket: "liwamenu-dca55.firebasestorage.app",
  messagingSenderId: "155320793490",
  appId: "1:155320793490:web:2d375db48cd7dee2dca94b",
});

const messaging = firebase.messaging();

// Relay push data to all open clients
function relayToClients(data, notification) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    console.log("[FCM SW] Relaying to", clients.length, "client(s)");
    clients.forEach((client) => {
      client.postMessage({ type: "FCM_BACKGROUND_MESSAGE", payload: { data, notification } });
    });
  });
}

messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] onBackgroundMessage:", JSON.stringify(payload));
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "LiwaMenu";
  const body = notification.body || data.body || "";

  relayToClients(data, notification);

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    data: data,
  });
});

// Fallback: listen for raw push events (catches messages that skip onBackgroundMessage)
self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }
  console.log("[FCM SW] push event:", JSON.stringify(payload));

  const data = payload.data || {};
  const notification = payload.notification || {};

  // Relay to clients regardless
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      console.log("[FCM SW] push relay to", clients.length, "client(s)");
      clients.forEach((client) => {
        client.postMessage({ type: "FCM_BACKGROUND_MESSAGE", payload: { data, notification } });
      });
    })
  );
});

// When user clicks the notification, focus/open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});

// Force activate new SW immediately
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
