const CACHE_NAME = "breakaway-futsal-offline-v5";

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

const EXTERNAL_FILES = [
  "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js",
  "https://unpkg.com/xlsx/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.0/FileSaver.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const file of APP_FILES) {
      try {
        await cache.add(file);
      } catch (error) {
        console.warn("Offline cache: não foi possível guardar", file, error);
      }
    }

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

    if (cached) {
      const url = new URL(request.url);

      // Keep the file input visually hidden, but not display:none.
      // This makes Android's native file picker open reliably in offline/PWA mode.
      if (url.pathname.endsWith("/style.css")) {
        try {
          const css = await cached.text();
          const fixedCss = css.replace(
            ".head-input { display: none; }",
            ".head-input { position: absolute; width: 1px; height: 1px; opacity: 0; }"
          );
          return new Response(fixedCss, {
            headers: { "Content-Type": "text/css; charset=utf-8" }
          });
        } catch (error) {
          console.warn("Offline CSS adjustment failed", error);
        }
      }

      if (url.pathname.endsWith("/libs/xlsx.full.min.js")) {
        const external = await caches.match("https://unpkg.com/xlsx/dist/xlsx.full.min.js");
        if (external) return external;
      }

      return cached;
    }

    try {
      const response = await fetch(request);
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
