// Generated from shipped bytes by scripts/prepare-offline.mjs.
const PREFIX = "hub-party-content-";
const STAMP = "a46ce600cb605146628460321f0e9811c0939ad5e5cc08d4627415191bd065d3";
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
const shellMarker = () => new URL("./shell-ready", self.registration.scope);
async function responseHash(response) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer()));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// A fresh cache is filled completely before it replaces the live one, so a
// half-downloaded build can never serve a broken mix of old and new files.
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const existing = await caches.open(CACHE);
      if (!(await existing.match(shellMarker()))) {
        try {
          const manifestResponse = await fetch(new URL("./offline-files.json", self.registration.scope), { cache: "reload" });
          if (!manifestResponse.ok || manifestResponse.redirected)
            throw new Error("Offline manifest needs a direct successful response");
          const manifest = await manifestResponse.clone().json();
          if (manifest.digest !== STAMP) throw new Error("Offline build changed during install");
          // Stage and verify every shell response before writing the new cache.
          const responses = await Promise.all(CORE.map(async (file) => {
            if (file === "./offline-files.json") return manifestResponse;
            const response = await fetch(new URL(file, self.registration.scope), { cache: "reload" });
            if (!response.ok || response.redirected)
              throw new Error("Offline cache needs a direct successful response");
            if (await responseHash(response) !== manifest.hashes[file === "./" ? "./index.html" : file])
              throw new Error("Offline shell content changed during install");
            return response;
          }));
          for (let i = 0; i < CORE.length; i++)
            await existing.put(new URL(CORE[i], self.registration.scope), responses[i]);
          await existing.put(shellMarker(), new Response(STAMP));
        } catch (error) {
          await caches.delete(CACHE);
          throw error;
        }
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
  if (isAsset(url)) {
    const cache = caches.open(CACHE);
    const network = fetch(event.request).then(async (response) => {
      if (response.ok && !response.redirected)
        await (await cache).put(event.request, response.clone());
      return response;
    });
    // Register the lifetime extension while the fetch event is dispatching.
    event.waitUntil(network.catch(() => {}));
    event.respondWith((async () => {
      const cached = event.request.cache === "reload" ? null
        : await (await cache).match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      return network.catch(() => new Response("This asset is not saved offline.", { status: 503 }));
    })());
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Keep a complete shell pinned to its build until the next worker activates.
      if (coreSet().has(url.pathname) && event.request.cache !== "reload") {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
      }
      try {
        const response = await fetch(event.request);
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
