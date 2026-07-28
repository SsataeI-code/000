/* Total Form Fitness service worker — Web Push (§10). Keeps things minimal:
   shows incoming pushes and focuses/open the app on tap. No offline caching yet. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Total Form Fitness", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Total Form Fitness";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag || undefined,
    data: { link: data.link || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(link) && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(link);
    }),
  );
});
