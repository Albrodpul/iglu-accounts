/// <reference lib="webworker" />

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title || "Iglu";
  const options = {
    body: data.body || "",
    icon: "/pwa-icon-192.svg",
    badge: "/pwa-icon-192.svg",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
