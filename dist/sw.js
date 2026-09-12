const CACHE = "hub-party-content-v1";
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
  "./js/levels.js",
  "./js/engine.js",
  "./js/storage.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/dm-sans-400.ttf",
  "./assets/dm-sans-700.ttf",
  "./assets/space-grotesk-400.ttf",
  "./assets/space-grotesk-700.ttf",
  "./credits.html",
  "./offline-files.json",
];
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
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(new URL(self.registration.scope).pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Images and fonts are stable; prefer cached copies. Documents and code refresh online.
      if (/\.(png|jpg|svg|ttf)$/.test(url.pathname)) {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
      }
      try {
        const response = await fetch(event.request);
        if (response.ok && !response.redirected)
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
