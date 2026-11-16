// Service worker mínimo (FTD instalar-app, aisales): hace instalable la app sin cachear código,
// así cada despliegue se ve al instante. Solo responde navegaciones sin red con una página offline.
const OFFLINE = "/offline.html";
const CACHE = "sa-aisales-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("sa-aisales-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // API, estilos y scripts van directo a la red
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
