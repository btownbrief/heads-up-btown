// The build stamp is the single owner of the content cache name. Bump it in this
// file whenever dist/ changes; the page discovers the live name instead of
// hardcoding it.
const PREFIX = "hub-party-content-";
const STAMP = "2026-09-13";
const CACHE = PREFIX + STAMP;
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./game.css",
  "./fonts.css",
  "./js/main.js",
  "./js/ui.js",
  "./js/decks.js",
  "./js/extra-decks.js",
  "./js/general-decks.js",
  "./js/catalog.js",
  "./js/levels.js",
  "./js/engine.js",
  "./js/storage.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/dm-sans-400.ttf",
  "./assets/dm-sans-700.ttf",
  "./assets/space-grotesk-400.ttf",
  "./assets/space-grotesk-700.ttf",
  "./credits.html",
  "./offline-files.json",
];
const scopePath = () => new URL(self.registration.scope).pathname;
const coreSet = () =>
  new Set(CORE.map((u) => new URL(u, self.registration.scope).pathname));
const isAsset = (url) => url.pathname.startsWith(scopePath() + "assets/");
const mayStore = (url) => coreSet().has(url.pathname) || isAsset(url);
// A fresh cache is filled completely before it replaces the live one, so a
// half-downloaded build can never serve a broken mix of old and new files.
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const url of CORE) {
        const r = await fetch(new URL(url, self.registration.scope), {
          cache: "reload",
        });
        if (!r.ok || r.redirected)
          throw new Error("Offline cache needs a direct successful response");
        await cache.put(new URL(url, self.registration.scope), r);
      }
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "cache-name")
    event.ports[0]?.postMessage({ cache: CACHE });
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(scopePath())
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Card images and fonts answer from the cache straight away, then refresh
      // in the background so a replaced file reaches the next visit.
      if (isAsset(url)) {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        const network = fetch(event.request)
          .then(async (response) => {
            if (response.ok && !response.redirected)
              await cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        const fresh = await network;
        if (fresh) return fresh;
      }
      try {
        const response = await fetch(event.request);
        if (response.ok && !response.redirected && mayStore(url))
          await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const home = await cache.match(
            new URL("./index.html", self.registration.scope),
          );
          if (home) return home;
        }
        return new Response(
          "This file is not saved offline. Reconnect and choose Save for offline.",
          { status: 503, headers: { "Content-Type": "text/plain" } },
        );
      }
    })(),
  );
});
