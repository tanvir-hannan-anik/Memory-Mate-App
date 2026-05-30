importScripts(
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBIQ_k6v4yg14LAcvbzfxHrjHcjK-Mt50Y",
  authDomain: "dementia-e3d47.firebaseapp.com",
  projectId: "dementia-e3d47",
  storageBucket: "dementia-e3d47.firebasestorage.app",
  messagingSenderId: "764736387361",
  appId: "1:764736387361:web:ca06450c1f949f4df6e660",
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Memora", {
    body: body || "",
    icon: icon || "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.data?.tag || "memora",
    data: payload.data,
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "view" || !event.action) {
    event.waitUntil(clients.openWindow("/"));
  }
});
