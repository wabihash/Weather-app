const CACHE_NAME = 'skycast-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',
    '/search-line (1).svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
