const CACHE_NAME = "breakaway-futsal-offline-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./main.js",
  "./style.css",
  "./manifest.json"
];

const EXTERNAL_FILES = [
  "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js",
  "https://unpkg.com/xlsx/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.0/FileSaver.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Cache the local application files first. If one is missing,
    // the service worker installation must not break the application.
    for (const file of APP_FILES) {
      try {
        await cache.add(file);
      } catch (error) {
        console.warn("Offline cache: não foi possível guardar", file, error);
      }
    }

    // Cache the existing external libraries so the current application
    // can continue to use them without changing its JavaScript logic.
    for (const url of EXTERNAL_FILES) {
      try {
        const response = await fetch(url, { mode: "no-cors", cache: "no-cache" });
        await cache.put(url, response);
      } catch (error) {
        console.warn("Offline cache: não foi possível guardar", url, error);
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      // Keep local application resources available for future offline use.
      if (new URL(request.url).origin === self.location.origin && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }

      throw error;
    }
  })());
});
