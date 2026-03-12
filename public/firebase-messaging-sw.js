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
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "LiwaMenu";
  const body = notification.body || data.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    data: data,
  });
});
