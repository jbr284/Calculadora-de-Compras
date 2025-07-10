const CACHE_NAME = "calculadora-compras-v1";
const URLS_TO_CACHE = [
  "/Calculadora-de-Compras/",
  "/Calculadora-de-Compras/index.html",
  "/Calculadora-de-Compras/manifest.json",
  "/Calculadora-de-Compras/icon-192.png",
  "/Calculadora-de-Compras/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.21/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
