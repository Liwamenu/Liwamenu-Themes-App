/* eslint-disable no-undef */
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

function relayToClients(data, notification) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "FCM_BACKGROUND_MESSAGE", payload: { data, notification } });
    });
  });
}

messaging.onBackgroundMessage((payload) => {
  console.log("[FCM background] onBackgroundMessage:", payload);
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  relayToClients(data, notification);
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = JSON.parse(event.data?.text() || "{}");
  } catch {
    payload = {};
  }

  console.log("[FCM background] push event received:", payload);

  const title = payload?.notification?.title || "QR Menu";
  const body = payload?.notification?.body || "New update";
  const data = payload?.data || {};

  relayToClients(data, payload?.notification);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
