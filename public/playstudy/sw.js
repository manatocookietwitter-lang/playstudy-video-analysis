const LEGACY_CACHES = /^playstudy-(?:v|shell-v)(?:[1-9]|10)(?:-|$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => LEGACY_CACHES.test(key)).map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.navigate('/')));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => Response.redirect('/', 302)));
});
