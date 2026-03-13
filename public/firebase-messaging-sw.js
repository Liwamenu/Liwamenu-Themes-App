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

messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Background message received:", JSON.stringify(payload));
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "LiwaMenu";
  const body = notification.body || data.body || "";

  // Relay data to all open clients so the app can update state
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "FCM_BACKGROUND_MESSAGE", payload: { data, notification } });
    });
  });

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    data: data,
  });
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
