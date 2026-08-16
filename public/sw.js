/* ============================================================
   Katch Studio — service worker
   Strategy:
   - Navigation requests: network-first with offline fallback to
     the cached app shell (index.html).
   - Same-origin static assets: stale-while-revalidate.
   - Version bump (VERSION const) + SKIP_WAITING → the app shows
     an "Update available" banner via the controllerchange event.
   No fragile data synchronization — project data sync belongs to
   the storage layer (localStorage / Firestore), never the SW.
   ============================================================ */

const VERSION = "katch-studio-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  /* Navigations: network-first, fall back to the shell when offline */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(SHELL))
    );
    return;
  }

  /* Static assets: stale-while-revalidate */
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    })
  );
});

/* Let the client know a new version is ready */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
