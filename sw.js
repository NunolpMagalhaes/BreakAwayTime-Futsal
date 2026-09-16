const CACHE_NAME = "breakaway-futsal-offline-v6";

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

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const file of APP_FILES) {
      try { await cache.add(file); }
      catch (error) { console.warn("Offline cache: não foi possível guardar", file, error); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    let response = await caches.match(request);

    if (!response) {
      try {
        response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
      } catch (error) {
        if (request.mode === "navigate") response = await caches.match("./index.html");
      }
    }

    if (!response) throw new Error("Offline resource unavailable");

    // Do not use display:none for the file inputs. On some Android PWA/WebView
    // configurations that prevents the native file picker from opening offline.
    if (new URL(request.url).pathname.endsWith("/style.css")) {
      const css = await response.text();
      const fixedCss = css.replace(
        ".head-input { display: none; }",
        ".head-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; }\n.load-file { position: relative; }"
      );
      return new Response(fixedCss, {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "text/css; charset=utf-8" }
      });
    }

    return response;
  })());
});
