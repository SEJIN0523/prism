// Installability only. No CacheStorage, precache, offline fallback or record access.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  // Samsung/Chrome compatibility: a fetch handler, always delegated to network.
  // Also bypass the HTTP cache for requests handled here, including future JSON.
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
