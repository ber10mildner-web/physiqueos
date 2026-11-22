/*
 * Sigma service worker: makes the installed app usable without a connection.
 * - App code, fonts and icons: cache first (file names change with every deploy).
 * - Pages: network first; the last version of each page is kept on this phone
 *   and shown when there is no connection.
 * - Everything else (data requests, saving) goes straight to the network.
 *   Entries made offline are queued by the app itself (src/lib/offline/queue.ts).
 */
const VERSION = "2026-11-22";
const STATIC = `sigma-static-${VERSION}`;
const PAGES = "sigma-pages";
const OFFLINE_URL = "/offline.html";
const NO_CACHE = /^\/(login|auth|api|setup)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sigma-static-") && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // sent on sign-out: forget all pages stored on this phone
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate" && !NO_CACHE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && res.type === "basic") cache.put(req, res.clone());
          return res;
        } catch {
          return (
            (await cache.match(req)) ||
            (await cache.match(req, { ignoreSearch: true })) ||
            (await caches.match(OFFLINE_URL)) ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
          );
        }
      })(),
    );
  }
});
