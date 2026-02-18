const CACHE_NAME = 'skycast-v4';
const ASSETS = [
    '/styles.css',
    '/main.js',
    '/search-line (1).svg'
];

// Install Event: Cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Activate new SW immediately
}); 

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event: Network first for HTML, Cache first for others
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // For HTML files, try network first
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
