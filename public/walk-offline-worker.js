/* Cache only the standalone offline viewer. Never cache API responses or OSM tiles. */
const viewer = new URL('offline-walks.html', self.registration.scope).href;
const viewerCache = `townshipgo-offline-viewer-v1:${self.registration.scope}`;
self.addEventListener('install', event => event.waitUntil((async () => {
    const cache = await caches.open(viewerCache);
    await cache.add(new Request(viewer, { cache: 'reload' }));
    await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url), scope = new URL(self.registration.scope);
    if (event.request.mode === 'navigate' && url.origin === scope.origin && [scope.pathname.replace(/\/$/, ''), `${scope.pathname}resident`].includes(url.pathname.replace(/\/$/, ''))) {
        event.respondWith(fetch(event.request).catch(() => Response.redirect(viewer, 302)));
        return;
    }
    if (event.request.method !== 'GET' || new URL(event.request.url).href.split('?')[0] !== viewer) return;
    event.respondWith(fetch(event.request).then(async response => {
        if (response.ok) { const cache = await caches.open(viewerCache); await cache.put(viewer, response.clone()); }
        return response;
    }).catch(async () => (await caches.match(viewer)) || new Response('Offline viewer unavailable. Open your downloaded walk pack.', { status: 503 })));
});
