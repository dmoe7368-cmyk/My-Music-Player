const CACHE_NAME = "my-music-player-v1";
const APP_SHELL = [
  "/My-Music-Player/",
  "/My-Music-Player/index.html",
  "/My-Music-Player/css/style.css",
  "/My-Music-Player/js/config.js",
  "/My-Music-Player/js/app.js",
  "/My-Music-Player/manifest.json",
  "/My-Music-Player/icons/icon-192.png",
  "/My-Music-Player/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.hostname.includes("googleapis.com") ||
      url.hostname.includes("drive.google.com")) return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
      )
    );
  }
});
