const CACHE_NAME = "breakaway-futsal-offline-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./main.js",
  "./style.css",
  "./manifest.json",
  "./libs/jquery.min.js",
  "./libs/xlsx.full.min.js",
  "./libs/FileSaver.min.js"
];

const EXTERNAL_FILES = [];


self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Keep the application files available offline.
    for (const file of APP_FILES) {
      try {
        await cache.add(file);
      } catch (error) {
        console.warn("Offline cache: não foi possível guardar", file, error);
      }
    }

    // Keep the libraries currently used by the application available offline.
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

      // Cache resources from the application and its external libraries so
      // that anything successfully loaded while online can also be reused offline.
      if (response.ok || response.type === "opaque") {
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
