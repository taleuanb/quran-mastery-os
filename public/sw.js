// Service worker minimal : l'app reste ouvrable sans réseau. Réseau d'abord (les mises à jour
// arrivent dès qu'on est connecté), cache en repli. Les données, elles, vivent dans localStorage.
const CACHE = 'qmos-shell-v1';

// À l'installation : précharge la page et ses fichiers (lus dans index.html), pour que la toute
// première ouverture hors réseau fonctionne déjà.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const page = await fetch('./index.html', { cache: 'reload' });
      const html = await page.clone().text();
      const files = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
      await cache.put('./index.html', page.clone());
      await cache.put('./', page);
      await Promise.all(files.map((f) => cache.add(f).catch(() => {})));
      await self.skipWaiting();
    })().catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html'))),
  );
});
